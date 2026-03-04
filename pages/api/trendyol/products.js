// pages/api/trendyol/products.js — Güncel API: GET /product/sellers/{sellerId}/products (filterProducts)
import { productListUrl } from "@/lib/marketplaces/trendyolConfig";
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";

export default async function handler(req, res) {
  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({
      message: "Trendyol API bilgileri eksik. Dashboard → API Ayarları → Trendyol bölümünden girin (veya .env tanımlayın).",
    });
  }
  const { supplierId, apiKey, apiSecret } = creds;

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const url = productListUrl(supplierId);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
        "User-Agent": process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0",
      },
    });

    const text = await response.text();

    if (!response.ok) {
      const is401 = response.status === 401;
      const msg = is401
        ? "Trendyol yetki hatası (401). API Key ve API Secret'ı Stage/Canlı panel Hesap Bilgilerim'den yeniden kopyalayıp API Ayarları → Trendyol'a girin."
        : (text.startsWith("<") ? `Trendyol API HTTP ${response.status} (HTML — yetki veya endpoint kontrolü)` : text.slice(0, 200));
      console.warn("Trendyol products API:", response.status, msg.slice(0, 100));
      return res.status(response.status).json({
        message: msg,
        status: response.status,
      });
    }

    if (!text || text.trim().startsWith("<")) {
      console.warn("Trendyol products: HTML yanıt alındı, JSON bekleniyordu.");
      return res.status(502).json({
        message: "Trendyol API JSON yerine HTML döndü. Test ortamında IP yetkisi veya API bilgilerini kontrol edin.",
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn("Trendyol products: JSON parse hatası", e.message);
      return res.status(502).json({
        message: "Trendyol yanıtı geçerli JSON değil. API veya ortam ayarlarını kontrol edin.",
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Trendyol API Hatası:", error);
    return res.status(500).json({
      message: error.message || "Veri alınamadı",
    });
  }
}
