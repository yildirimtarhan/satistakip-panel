// 📁 /pages/api/hepsiburada-api/catalog/test-connection.js

export default async function handler(req, res) {
  try {
    const baseUrl = process.env.HEPSIBURADA_BASE_URL;
    const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
    const auth = process.env.HEPSIBURADA_AUTH;
    const userAgent = process.env.HEPSIBURADA_USER_AGENT;

    // 🔍 Env kontrolü
    if (!baseUrl || !merchantId || !auth || !userAgent) {
      return res
        .status(500)
        .json({ message: "Eksik environment değişkeni" });
    }

    // 🔗 Doğru test URL (Hepsiburada Test ortamı için)
    const url = `${baseUrl}/listings/merchantid/${merchantId}/products`;

    // 🛰️ İstek gönder
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

    const raw = await response.text();

    // 🧭 Sonucu döndür
    return res.status(200).json({
      status: response.status,
      ok: response.ok,
      message: response.ok
        ? "✅ Bağlantı başarılı"
        : "❌ Hepsiburada API hatası",
      raw,
    });
  } catch (err) {
    console.error("🔥 Hepsiburada bağlantı testi hatası:", err);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
