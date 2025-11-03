import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenir" });
  }

  // ✅ Basic Auth kontrolü
  const authHeader = req.headers.authorization;
  const expectedAuth =
    "Basic " +
    Buffer.from(
      `${process.env.HB_WEBHOOK_USERNAME}:${process.env.HB_WEBHOOK_PASSWORD}`
    ).toString("base64");

  if (authHeader !== expectedAuth) {
    console.warn("🚨 Geçersiz webhook erişim denemesi.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const event = req.body;
    const eventType = event.TransactionType || event.eventType;
    const orderNo = event.OrderNumber || event.orderId;

    console.log(`📩 [HB Webhook] Yeni event: ${eventType} - ${orderNo}`);

    const client = await clientPromise;
    const db = client.db("satistakip");

    // ✅ Event log kaydı
    await db.collection("webhookEvents").insertOne({
      raw: event,
      orderNo,
      type: eventType,
      receivedAt: new Date(),
    });

    // ✅ Sadece yeni sipariş event'i işlenecek
    if (eventType === "OrderCreated" && orderNo) {
      console.log(`🔄 Sipariş detayı çekiliyor: ${orderNo}`);

      const authString = Buffer.from(
        `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
      ).toString("base64");

      // ✅ Doğru OMS endpoint (HB test guide)
      const url = `https://oms-external-sit.hepsiburada.com/orders/merchantid/${process.env.HB_MERCHANT_ID}?orderNumber=${orderNo}`;

      console.log("🌐 HB OMS URL:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${authString}`,
          "User-Agent": process.env.HB_USER_AGENT,
          Accept: "application/json",
        },
      });

      // ✅ Response debug
      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ HB API error (${orderNo}) status=${response.status}:`, errText);
        return res.status(500).json({ success: false, message: "HB order fetch failed" });
      }

      // ✅ Bazı HB stub cevapları boş döner → text fallback
      let orderDetail;
      try {
        const text = await response.text();
        orderDetail = text ? JSON.parse(text) : null;
      } catch {
        orderDetail = null;
      }

      if (!orderDetail) {
        console.warn(`⚠️ HB boş cevap döndü → OMS stub sipariş hazır olmayabilir: ${orderNo}`);
        return res.status(200).json({ success: true, note: "HB returned empty" });
      }

      console.log(`📦 Sipariş Detayı Alındı: ${orderNo}`);

      // ✅ DB'ye sipariş kaydı (upsert)
      await db.collection("orders").updateOne(
        { orderNumber: orderNo },
        {
          $set: {
            orderNumber: orderNo,
            platform: "hepsiburada",
            data: orderDetail,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      console.log(`✅ Sipariş veritabanına kaydedildi: ${orderNo}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("🔥 Webhook işleme hatası:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
