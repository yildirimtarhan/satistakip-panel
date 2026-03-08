// 📄 /pages/api/trendyol/test-connection.js — Güncel API: apigw / stageapigw
import { ordersListUrl } from "@/lib/marketplaces/trendyolConfig";
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";

export default async function handler(req, res) {
  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({
      success: false,
      message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol bölümünden girin (veya .env tanımlayın)."
    });
  }
  const { supplierId, apiKey, apiSecret } = creds;
  const userAgent = process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0";

  const startDate = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const endDate = Date.now();
  const url = `${ordersListUrl(supplierId)}?startDate=${startDate}&endDate=${endDate}&size=1`;

  try {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": userAgent,
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

    // 401: Yetki hatası — net yönlendirme
    if (status === 401) {
      return res.status(401).json({
        success: false,
        message: "Trendyol yetki hatası (401). Supplier ID, API Key ve API Secret aynı Trendyol hesabından (Hesap Bilgilerim) olmalı; başında/sonunda boşluk olmamalı. Test için Stage panel, canlı için canlı panel bilgilerini kullanın.",
        error: text?.slice(0, 200),
        timestamp: new Date().toISOString()
      });
    }

    // Diğer hatalar
    return res.status(status).json({
      success: false,
      message: `❌ Trendyol API bağlantısı başarısız. HTTP ${status}`,
      error: text?.slice(0, 200),
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
