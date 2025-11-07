// 📁 /pages/api/trendyol/test-connection.js
// ✅ Trendyol API bağlantısını test eder (SatışTakip ERP entegrasyonu için)

export default async function handler(req, res) {
  // 🌍 Ortam değişkenlerini al
  const baseUrl = process.env.TRENDYOL_BASE_URL;
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;

  // ⚠️ Kontrol: Ortam değişkenleri eksik mi?
  if (!baseUrl || !supplierId || !apiKey || !apiSecret) {
    return res.status(500).json({
      ok: false,
      message: "Eksik environment değişkeni. Lütfen .env.local dosyasını kontrol edin.",
      required: ["TRENDYOL_BASE_URL", "TRENDYOL_SUPPLIER_ID", "TRENDYOL_API_KEY", "TRENDYOL_API_SECRET"],
    });
  }

  // 🔐 Basic Auth oluştur
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    console.log("📡 Trendyol bağlantı testi başlatıldı...");

    // ⏱ Test isteği: Sipariş listesi (stage ortamında)
    const response = await fetch(`${baseUrl}/suppliers/${supplierId}/orders?status=Created`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": "tigdes_dev",
        "Content-Type": "application/json",
      },
    });

    // 🧾 Gelen yanıtı JSON olarak çöz
    const data = await response.json();

    // 🚨 API hatası varsa yakala
    if (!response.ok) {
      console.error("❌ Trendyol bağlantı hatası:", data);
      return res.status(response.status).json({
        ok: false,
        message: "Trendyol API bağlantı hatası",
        status: response.status,
        raw: data,
      });
    }

    // ✅ Başarılı sonuç
    console.log("✅ Trendyol API bağlantısı başarılı!");
    return res.status(200).json({
      ok: true,
      message: "✅ Trendyol API bağlantısı başarılı!",
      supplierId,
      status: response.status,
      resultCount: data?.content?.length || 0,
      sampleOrder: data?.content?.[0] || null,
    });

  } catch (error) {
    console.error("🔥 Sunucu hatası:", error);
    return res.status(500).json({
      ok: false,
      message: "Sunucu hatası veya Trendyol API erişilemiyor.",
      error: error.message,
    });
  }
}
