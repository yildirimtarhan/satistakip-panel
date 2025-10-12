// pages/api/hepsiburada-api/orders/webhook.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  // ✅ Hepsiburada'nın Basic Auth doğrulaması
  const authHeader = req.headers.authorization;
  const expectedAuth =
    "Basic " +
    Buffer.from(
      `${process.env.HEPSIBURADA_MERCHANT_ID}:${process.env.HEPSIBURADA_SECRET_KEY}`
    ).toString("base64");

  if (!authHeader || authHeader !== expectedAuth) {
    console.error("Webhook yetkilendirme hatası:", authHeader);
    return res.status(401).json({ message: "Yetkisiz istek" });
  }

  try {
    // ✅ Gelen Webhook verisini alıyoruz
    const body = req.body;

    console.log("📩 Hepsiburada Webhook geldi:", JSON.stringify(body, null, 2));

    // Burada gelen veriyi veritabanına kaydedebilir,
    // sipariş durumunu güncelleyebilir veya log tutabilirsin.
    // Örn: webhook event tipine göre ayrıştırma yapılabilir.
    // body.eventType, body.orderNumber vs.

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook işleme hatası:", error);
    return res.status(500).json({ message: "Webhook işlenirken hata oluştu" });
  }
}

// ✅ Next.js body parser'ı devre dışı bırakılmadıysa, JSON otomatik parse edilir.
// Eğer Hepsiburada raw body gönderirse, aşağıdaki satırları eklememiz gerekebilir:
// export const config = {
//   api: {
//     bodyParser: true,
//   },
// };
