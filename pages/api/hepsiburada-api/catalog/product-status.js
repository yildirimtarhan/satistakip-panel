// 📁 /pages/api/hepsiburada-api/catalog/product-status.js

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const baseUrl = process.env.HEPSIBURADA_BASE_URL; // ✅ mpop-sit.hepsiburada.com
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const auth = process.env.HEPSIBURADA_AUTH;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!auth || !merchantId || !userAgent || !baseUrl) {
    return res.status(500).json({ message: "Eksik environment değişkeni" });
  }

  const { merchantSku } = req.query;
  if (!merchantSku) {
    return res.status(400).json({ message: "merchantSku parametresi gereklidir. ?merchantSku=ERP-TEST-001" });
  }

  try {
    const url = `${baseUrl}/api/products/status?merchantSku=${merchantSku}`;
    console.log("📡 Ürün durum sorgulama URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": userAgent,
        "merchantid": merchantId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Ürün durumu sorgulama hatası:", data);
      return res.status(response.status).json({
        ok: false,
        message: "❌ Hepsiburada API hatası",
        raw: data,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "✅ Ürün durumu başarıyla sorgulandı",
      data,
    });

  } catch (err) {
    console.error("🔥 Sunucu hatası /product-status:", err);
    return res.status(500).json({
      ok: false,
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
