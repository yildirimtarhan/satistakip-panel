// 📁 /pages/api/trendyol/price-update.js — Güncel API: POST /inventory/sellers/{id}/products/price-and-inventory
import { priceAndInventoryUrl } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Sadece POST" });
  }

  try {
    const { getTrendyolCredentials } = await import("@/lib/getTrendyolCredentials");
    const creds = await getTrendyolCredentials(req);
    if (!creds) {
      return res.status(400).json({ ok: false, message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol." });
    }
    const { supplierId, apiKey, apiSecret } = creds;
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    /**
     * body: { items: [ { barcode, quantity, listPrice, salePrice }, ... ] }
     */
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "items[] gereklidir" });
    }

    const url = priceAndInventoryUrl(supplierId);
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "User-Agent": "satistakip_buybox/1.0",
      },
      body: JSON.stringify({ items }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(resp.status).json({ ok: false, message: "Trendyol hata", raw: data });
    }

    return res.status(200).json({ ok: true, data });
  } catch (e) {
    console.error("price-update error:", e);
    return res.status(500).json({ ok: false, message: "Sunucu hatası", error: e.message });
  }
}
