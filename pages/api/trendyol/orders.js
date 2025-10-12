// pages/api/hepsiburada-api/orders/index.js

export default async function handler(req, res) {
  try {
    const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
    const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
    const userAgent = process.env.HEPSIBURADA_USER_AGENT;
    const baseUrl = process.env.HEPSIBURADA_BASE_URL;

    if (!merchantId || !secretKey || !userAgent || !baseUrl) {
      return res.status(500).json({ message: "Hepsiburada API environment değişkenleri eksik." });
    }

    // Test tarih aralığı (isteğe göre dinamik yapılabilir)
    const beginDate = "2024-10-11 00:00";
    const endDate = "2024-10-12 00:00";
    const offset = 0;
    const limit = 100;

    // ✅ Doğru endpoint yapısı
    const url = `${baseUrl}/orders/merchantid/${merchantId}?offset=${offset}&limit=${limit}&beginDate=${encodeURIComponent(beginDate)}&endDate=${encodeURIComponent(endDate)}`;

    const authToken = Buffer.from(`${merchantId}:${secretKey}`).toString('base64');

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Authorization": `Basic ${authToken}`,
        "Accept": "application/json",
      },
    });

    // Hepsiburada bazen boş response veya hata dönerse kontrol edelim
    if (!response.ok) {
      const text = await response.text();
      console.error("Hepsiburada API Hatası:", response.status, text);
      return res.status(response.status).json({
        message: "Hepsiburada API hatası",
        status: response.status,
        error: text,
      });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, content: data });

  } catch (error) {
    console.error("Hepsiburada API Bağlantı Hatası:", error);
    return res.status(500).json({
      message: "Hepsiburada API bağlantı hatası",
      error: error.message,
    });
  }
}
