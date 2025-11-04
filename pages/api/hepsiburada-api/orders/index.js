import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    const { offset = 0, limit = 100, beginDate, endDate } = req.query;

    if (!beginDate || !endDate) {
      return res.status(400).json({ success: false, message: "beginDate ve endDate zorunludur." });
    }

    const authString = Buffer.from(
      `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
    ).toString("base64");

    const apiUrl = `https://mpop-sit.hepsiburada.com/api/oms/v1/orders?offset=${offset}&limit=${limit}&beginDate=${encodeURIComponent(beginDate)}&endDate=${encodeURIComponent(endDate)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${authString}`,
        "User-Agent": process.env.HB_USER_AGENT,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "hb-client-id": process.env.HB_MERCHANT_ID
      }
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonErr) {
      console.error("HB JSON Parse Error:", text);
      return res.status(200).json({ success: true, orders: [], info: "HB SIT boş response" });
    }

    const orders = data?.content || data?.orders || [];

    // ✅ MongoDB Cache yaz
    const client = await clientPromise;
    const db = client.db("satistakip");
    const col = db.collection("hb_orders");

    for (let o of orders) {
      await col.updateOne(
        { orderNumber: o.orderNumber },
        { $set: { data: o, fetchedAt: new Date() } },
        { upsert: true }
      );
    }

    return res.status(200).json({
      success: true,
      total: orders.length,
      orders
    });

  } catch (err) {
    console.error("🚨 HB API ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}
