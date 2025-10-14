import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  // Basic Auth kontrolü
  const authHeader = req.headers.authorization;
  const expectedAuth =
    "Basic " +
    Buffer.from(
      `${process.env.HB_WEBHOOK_USERNAME}:${process.env.HB_WEBHOOK_PASSWORD}`
    ).toString("base64");

  if (authHeader !== expectedAuth) {
    console.warn("🚨 Webhook erişimi reddedildi. Geçersiz kimlik bilgisi.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const event = req.body;
    console.log("📩 [HB Webhook] Yeni event alındı:", event);

    const client = await clientPromise;
    const db = client.db("satistakip");
    const collection = db.collection("webhookEvents");

    // Event'i log tablosuna kaydet
    await collection.insertOne({
      ...event,
      receivedAt: new Date(),
    });

    // 🧠 OrderCreated olduğunda Hepsiburada API'den sipariş detayını çek
    if (event.TransactionType === "OrderCreated" && event.OrderNumber) {
      console.log(`🔄 Sipariş detayı çekiliyor: ${event.OrderNumber}`);

      const authString = Buffer.from(
        `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
      ).toString("base64");

      const response = await fetch(
        `https://mpop-sit.hepsiburada.com/api/order-management-api/orders/${event.OrderNumber}`,
        {
          headers: {
            Authorization: `Basic ${authString}`,
            "User-Agent": process.env.HB_USER_AGENT,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(
          `🚨 Sipariş detayı alınamadı (${event.OrderNumber}):`,
          response.statusText
        );
      } else {
        const orderDetail = await response.json();
        console.log("📦 Sipariş Detayı:", orderDetail);

        // 📌 orderDetails koleksiyonuna kaydet
        const ordersCollection = db.collection("orderDetails");
        await ordersCollection.insertOne({
          orderNumber: event.OrderNumber,
          data: orderDetail,
          fetchedAt: new Date(),
        });

        console.log(`✅ Sipariş detayı veritabanına kaydedildi: ${event.OrderNumber}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("🔥 Webhook işleme hatası:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
