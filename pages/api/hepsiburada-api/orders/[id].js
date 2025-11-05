import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  const { id } = req.query; // id = orderNumber

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    const authString = Buffer.from(
      `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
    ).toString("base64");

    const omsUrl = `https://oms-external-sit.hepsiburada.com/orders/merchantid/${process.env.HB_MERCHANT_ID}?limit=50&offset=0`;

    console.log("📡 HB OMS Sipariş List URL:", omsUrl);

    const response = await fetch(omsUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authString}`,
        "User-Agent": process.env.HB_USER_AGENT,
        Accept: "application/json",
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("⚠️ OMS JSON parse edilemedi, text döndü");
      data = null;
    }

    // ✅ OMS içinde sipariş ara
    let order = data?.orders?.find((o) => o.orderNumber == id);

    // ✅ OMS bulamazsa MongoDB’den çek
    if (!order) {
      console.log("📦 OMS bulamadı → MongoDB fallback çalışıyor…");

      const client = await clientPromise;
      const db = client.db("satistakip");
      const mongoOrder = await db.collection("hb_orders").findOne({
        orderNumber: id,
      });

      if (mongoOrder) {
        order = mongoOrder.data;
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Sipariş bulunamadı: ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });

  } catch (err) {
    console.error("🔥 Tekil sipariş hata:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
