// 📁 /pages/api/trendyol/orders/index.js
// Trendyol siparişlerini çeker – stage veya canlı ortamda çalışır

import axios from "axios";

export default async function handler(req, res) {
  try {
    // 🌍 Ortam değişkenlerini al
    const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
    const apiKey = process.env.TRENDYOL_API_KEY;
    const apiSecret = process.env.TRENDYOL_API_SECRET;
    const baseUrl = process.env.TRENDYOL_API_BASE || "https://stageapi.trendyol.com/stagesapigw";

    // 🔒 Ortam değişkeni kontrolü
    if (!supplierId || !apiKey || !apiSecret) {
      return res.status(500).json({
        success: false,
        message: "Eksik Trendyol API environment değişkeni. (.env.local dosyasını kontrol edin)",
      });
    }

    // 🧩 Parametreler – tarih veya durum bazlı filtre
    const { status = "Created", startDate, endDate } = req.query;

    // 🕒 Tarih parametreleri (varsayılan: son 7 gün)
    const end = endDate || Date.now();
    const start = startDate || end - 7 * 24 * 60 * 60 * 1000;

    // 📡 Endpoint URL
    const url = `${baseUrl}/suppliers/${supplierId}/orders?status=${status}&startDate=${start}&endDate=${end}&size=50`;

    // 🔐 Basic Auth
    const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    console.log("📡 Trendyol Orders API çağrısı:", url);

    // 📨 İstek
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${authHeader}`,
        "User-Agent": "tigdes_dev",
        "Content-Type": "application/json",
      },
    });

    const data = response.data || {};

    // ✅ Başarılı yanıt
    return res.status(200).json({
      success: true,
      count: data?.content?.length || 0,
      orders: data,
    });
  } catch (error) {
    console.error("❌ Trendyol Orders API hatası:", error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Trendyol sipariş listesi alınamadı.",
      error: error?.response?.data || error.message,
    });
  }
}
