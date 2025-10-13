// pages/api/hepsiburada-api/orders/webhook.js
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  try {
    const event = req.body;
    console.log("📩 [HB Webhook] Yeni event alındı:", event);

    // 📌 MongoDB bağlantısı
    const client = await clientPromise;
    const db = client.db("satistakip");
    const collection = db.collection("webhookEvents");

    // 📌 Event'i veritabanına kaydet
    await collection.insertOne({
      ...event,
      receivedAt: new Date(),
    });

    // 📌 Event tipine göre özel işlem (isteğe bağlı)
    if (event.eventType === "OrderCreated") {
      console.log(`🆕 Yeni sipariş oluşturuldu: ${event.orderNumber}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("🔥 Webhook işleme hatası:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
