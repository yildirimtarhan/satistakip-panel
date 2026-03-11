import { connectToDatabase } from "@/lib/mongodb";
import { getHepsiburadaOmsBaseUrl } from "@/lib/hepsiburadaEnv";

export default async function handler(req, res) {
  try {
    const { offset = 0, limit = 100, beginDate, endDate } = req.query;

    const { db } = await connectToDatabase();
    const col = db.collection("hb_orders");

    // ✅ Step 1: SIT ortamında API bazen boş döner — önce DB göster
    const cachedOrders = await col
      .find({})
      .sort({ fetchedAt: -1 })
      .limit(50)
      .toArray();

    // Eğer beginDate yoksa sadece DB'den dön (dashboard açılışında)
    if (!beginDate || !endDate) {
      return res.status(200).json({
        success: true,
        source: "mongodb",
        total: cachedOrders.length,
        orders: cachedOrders
      });
    }

    // ✅ Step 2: HB API’ye istek gönder (PROD için gerekli)
    const merchantId = process.env.HB_MERCHANT_ID || process.env.HEPSIBURADA_MERCHANT_ID;
    const secret = process.env.HB_SECRET_KEY || process.env.HEPSIBURADA_SECRET_KEY;
    const authString = Buffer.from(`${merchantId}:${secret}`).toString("base64");

    const baseUrl = getHepsiburadaOmsBaseUrl();
    const apiUrl = `${baseUrl}/api/oms/v1/orders?offset=${offset}&limit=${limit}&beginDate=${encodeURIComponent(
      beginDate
    )}&endDate=${encodeURIComponent(endDate)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${authString}`,
        "User-Agent": process.env.HB_USER_AGENT || process.env.HEPSIBURADA_USER_AGENT || "satistakiponline_dev",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "hb-client-id": merchantId,
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // SIT boş dönmüş → DB'deki kayıtları göster
      return res.status(200).json({
        success: true,
        source: "mongodb-fallback",
        total: cachedOrders.length,
        orders: cachedOrders
      });
    }

    const apiOrders = data?.content || data?.orders || [];

    // ✅ Step 3: API’den gelenleri DB’ye yaz (cache)
    for (let o of apiOrders) {
      await col.updateOne(
        { orderNumber: o.orderNumber },
        { $set: { data: o, fetchedAt: new Date() } },
        { upsert: true }
      );
    }

    return res.status(200).json({
      success: true,
      source: "hepsiburada-api",
      total: apiOrders.length,
      orders: apiOrders.length > 0 ? apiOrders : cachedOrders,
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
