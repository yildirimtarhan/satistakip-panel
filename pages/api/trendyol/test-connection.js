// 📁 /pages/api/trendyol/test-connection.js
// ✅ Trendyol API bağlantısını test eder (SatışTakip ERP entegrasyonu için)
// Destek: TRENDYOL_BASE_URL veya TRENDYOL_API_BASE (her ikisi de çalışır)

export default async function handler(req, res) {
  // 🌍 Ortam değişkenlerini oku (fallback desteği ile)
  const baseUrl =
    process.env.TRENDYOL_BASE_URL ||
    process.env.TRENDYOL_API_BASE; // geriye uyumluluk

  const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;

  // ⚠️ Ortam değişkenleri kontrolü
  if (!baseUrl || !supplierId || !apiKey || !apiSecret) {
    console.error("❌ Eksik environment değişkeni:");
    return res.status(500).json({
      ok: false,
      message: "Eksik environment değişkeni. Lütfen .env.local ve Render Environment ayarlarını kontrol edin.",
      required: [
        "TRENDYOL_BASE_URL (veya TRENDYOL_API_BASE)",
        "TRENDYOL_SUPPLIER_ID",
        "TRENDYOL_API_KEY",
        "TRENDYOL_API_SECRET",
      ],
    });
  }

  // 🔐 Basic Auth oluştur
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const url = `${baseUrl.replace(/\/$/, "")}/suppliers/${supplierId}/orders?status=Created`;

  console.log("📡 Trendyol bağlantı testi başlatıldı...");
  console.log("🌍 Endpoint:", url);

  try {
    // ⏱ Trendyol API isteği
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": "tigdes_dev",
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    // 🚨 Trendyol hata yanıtı
    if (!response.ok) {
      console.error("❌ Trendyol API bağlantı hatası:", data);
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
