import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    const { offset = 0, limit = 100, beginDate, endDate } = req.query;

    const client = await clientPromise;
    const db = client.db("satistakip");
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
    const authString = Buffer.from(
      `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
    ).toString("base64");

    const apiUrl = `https://mpop-sit.hepsiburada.com/api/oms/v1/orders?offset=${offset}&limit=${limit}&beginDate=${encodeURIComponent(
      beginDate
    )}&endDate=${encodeURIComponent(endDate)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${authString}`,
        "User-Agent": process.env.HB_USER_AGENT,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "hb-client-id": process.env.HB_MERCHANT_ID,
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
