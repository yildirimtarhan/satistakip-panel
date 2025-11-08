export default async function handler(req, res) {
  try {
    const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
    const apiKey = process.env.TRENDYOL_API_KEY;
    const apiSecret = process.env.TRENDYOL_API_SECRET;
    const baseUrl = process.env.TRENDYOL_BASE_URL;
    const userAgent = process.env.TRENDYOL_USER_AGENT || "satistakip_online";

    if (!supplierId || !apiKey || !apiSecret || !baseUrl) {
      return res
        .status(500)
        .json({ success: false, message: "Trendyol ortam değişkenleri eksik." });
    }

    const start = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 gün önce
    const end = Date.now();
    const url = `${baseUrl}/suppliers/${supplierId}/orders?status=Created&startDate=${start}&endDate=${end}&size=50`;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    console.log("📡 Trendyol Orders API çağrısı:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    const text = await response.text();

    // Cloudflare HTML dönüşünü yakala
    if (!response.ok || text.startsWith("<!DOCTYPE")) {
      console.error("❌ Trendyol Orders API hatası:", text.slice(0, 200));
      return res.status(403).json({
        success: false,
        message:
          "Trendyol API erişimi başarısız. IP engeli olabilir veya test ortamı kapalı.",
        error: text.substring(0, 500),
      });
    }

    const data = JSON.parse(text);

    // Stage ortamı boşsa bilgilendir
    if (!data.content || data.content.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Henüz test siparişi bulunmuyor (Stage ortamı boş).",
        orders: [],
      });
    }

    return res.status(200).json({ success: true, orders: data.content });
  } catch (err) {
    console.error("🚨 Sunucu hatası:", err);
    return res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
}
