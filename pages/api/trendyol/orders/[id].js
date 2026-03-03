// pages/api/trendyol/orders/[id].js
// Güncel API: orderNumber ile GET /order/sellers/{sellerId}/orders?orderNumber=...
import { orderDetailUrl } from "@/lib/marketplaces/trendyolConfig";
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";

export default async function handler(req, res) {
  const { id } = req.query;

  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({ error: "Trendyol API bilgileri eksik. API Ayarları → Trendyol." });
  }
  const { supplierId, apiKey, apiSecret } = creds;

  const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const url = orderDetailUrl(supplierId, id);

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0",
      },
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: "Trendyol API hatası", detail: data });

    // API cevabı: { content: [paket1, ...], totalElements, ... } — tek sipariş için content[0]
    const single = Array.isArray(data.content) && data.content.length ? data.content[0] : data;
    return res.status(200).json(single);
  } catch (error) {
    console.error("🔥 Trendyol API Hatası:", error.message);
    return res.status(500).json({ error: "Trendyol API hatası", detail: error.message });
  }
}
