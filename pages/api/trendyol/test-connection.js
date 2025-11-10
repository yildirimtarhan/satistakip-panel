// 📄 /pages/api/trendyol/test-connection.js
export default async function handler(req, res) {
  const { TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY, TRENDYOL_API_SECRET, TRENDYOL_BASE_URL, TRENDYOL_USER_AGENT } = process.env;

  // Ortam değişkenleri kontrolü
  if (!TRENDYOL_SUPPLIER_ID || !TRENDYOL_API_KEY || !TRENDYOL_API_SECRET || !TRENDYOL_BASE_URL || !TRENDYOL_USER_AGENT) {
    return res.status(400).json({
      success: false,
      message: "Trendyol ortam değişkenleri eksik. Lütfen .env.local veya Render ayarlarını kontrol edin."
    });
  }

  const startDate = Date.now() - 7 * 24 * 60 * 60 * 1000; // son 7 gün
  const endDate = Date.now();
  const url = `${TRENDYOL_BASE_URL}/suppliers/${TRENDYOL_SUPPLIER_ID}/orders?startDate=${startDate}&endDate=${endDate}&size=1`;

  try {
    const auth = Buffer.from(`${TRENDYOL_API_KEY}:${TRENDYOL_API_SECRET}`).toString("base64");

    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": TRENDYOL_USER_AGENT,
        "Content-Type": "application/json"
      },
    });

    const text = await response.text();
    const status = response.status;

    // Başarılıysa
    if (status === 200) {
      return res.status(200).json({
        success: true,
        message: "✅ Trendyol API bağlantısı başarılı!",
        timestamp: new Date().toISOString(),
        data: text
      });
    }

    // Hata varsa
    return res.status(status).json({
      success: false,
      message: `❌ Trendyol API bağlantısı başarısız. HTTP ${status}`,
      error: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "❌ Bağlantı testi sırasında hata oluştu.",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
