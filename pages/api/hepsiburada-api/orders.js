// pages/api/hepsiburada-api/orders.js

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;
  const endpoint = process.env.HEPSIBURADA_ORDERS_ENDPOINT;

  if (!merchantId || !secretKey || !userAgent || !endpoint) {
    console.error("❌ Env eksik:", { merchantId, secretKey, userAgent, endpoint });
    return res.status(500).json({ message: "Hepsiburada API bilgileri eksik" });
  }

  try {
    const url = `${endpoint}/order/merchant-orders?status=New`;

    // 🧠 Basic Auth oluştur
    const authHeader = "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64");

    console.log("📡 Hepsiburada API isteği:", {
      url,
      headers: {
        Authorization: authHeader,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

    // 🔍 Eğer hata dönerse logla
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Hepsiburada API Hatası:", response.status, errorText);
      return res.status(response.status).json({
        message: "Hepsiburada API hatası",
        status: response.status,
        error: errorText || "Hepsiburada API boş yanıt döndürdü",
      });
    }

    // ✅ Başarılı
    const data = await response.json();
    console.log("✅ Hepsiburada API yanıtı:", data);
    return res.status(200).json(data);

  } catch (error) {
    console.error("💥 Sunucu Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
