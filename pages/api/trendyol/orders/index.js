// 📄 /pages/api/trendyol/orders/index.js
export default async function handler(req, res) {
  try {
    const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
    const apiKey = process.env.TRENDYOL_API_KEY;
    const apiSecret = process.env.TRENDYOL_API_SECRET;
    const baseUrl = process.env.TRENDYOL_BASE_URL;
    const userAgent = process.env.TRENDYOL_USER_AGENT || "satistakip_online";

    if (!supplierId || !apiKey || !apiSecret || !baseUrl) {
      return res.status(500).json({
        success: false,
        message: "Trendyol ortam değişkenleri eksik.",
      });
    }

    const now = Date.now();
    const startDate = now - 1000 * 60 * 60 * 24 * 3; // Son 3 gün
    const endDate = now;
    const status = "Created";

    const url = `${baseUrl}/suppliers/${supplierId}/orders?status=${status}&startDate=${startDate}&endDate=${endDate}&size=50`;

    // ✅ Gelişmiş Header Yapısı (Cloudflare korumasını aşmak için)
    const authToken = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const headers = {
      "User-Agent": userAgent,
      "Authorization": `Basic ${authToken}`,
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Origin": "https://stagepartner.trendyol.com",
      "Referer": "https://stagepartner.trendyol.com/",
      "Connection": "keep-alive",
      "DNT": "1",
      "Cache-Control": "no-cache",
    };

    console.log("📡 Trendyol Orders API çağrısı:", url);

    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Trendyol Orders API hatası:", text);
      return res.status(response.status).json({
        success: false,
        message: "Trendyol API erişimi başarısız. IP engeli olabilir veya test ortamı kapalı.",
        error: text,
      });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, orders: data });
  } catch (error) {
    console.error("🔥 Trendyol Orders API hata:", error);
    return res.status(500).json({
      success: false,
      message: "Trendyol API bağlantı hatası.",
      error: error.message,
    });
  }
}
