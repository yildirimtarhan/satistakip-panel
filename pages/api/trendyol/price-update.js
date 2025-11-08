// 📁 /pages/api/trendyol/price-update.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Sadece POST" });
  }

  try {
    const base = process.env.TRENDYOL_BASE_URL || "https://stageapi.trendyol.com/stagesapigw";
    const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
    const apiKey = process.env.TRENDYOL_API_KEY;
    const apiSecret = process.env.TRENDYOL_API_SECRET;

    if (!base || !supplierId || !apiKey || !apiSecret) {
      return res.status(500).json({ ok: false, message: "Trendyol env eksik" });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    /**
     * Beklenen body:
     * {
     *   items: [
     *     { barcode: "1234567890001", quantity: 12, listPrice: 120.0, salePrice: 109.9 },
     *     ...
     *   ]
     * }
     * Trendyol endpoint: POST /suppliers/{supplierId}/products/price-and-inventory
     */
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "items[] gereklidir" });
    }

    const url = `${base}/suppliers/${supplierId}/products/price-and-inventory`;
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
