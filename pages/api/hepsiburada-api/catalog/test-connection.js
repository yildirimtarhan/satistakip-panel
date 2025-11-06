// 📁 /pages/api/hepsiburada-api/catalog/test-connection.js
export default async function handler(req, res) {
  try {
    const baseUrl = process.env.HEPSIBURADA_BASE_URL;
    const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
    const auth = process.env.HEPSIBURADA_AUTH;
    const userAgent = process.env.HEPSIBURADA_USER_AGENT;

    if (!baseUrl || !auth || !merchantId || !userAgent) {
      return res.status(500).json({ message: "Eksik environment değişkeni" });
    }

    const url = `${baseUrl}/suppliers/merchantid/${merchantId}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": userAgent,
      },
    });

    const text = await response.text();
    return res.status(response.status).json({
      status: response.status,
      ok: response.ok,
      message: response.ok ? "✅ Bağlantı başarılı" : "❌ Hepsiburada API hatası",
      raw: text
    });
  } catch (err) {
    console.error("🔥 Hepsiburada bağlantı testi hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
