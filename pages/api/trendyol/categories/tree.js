// 📁 /api/trendyol/categories/tree.js — getCategoryTree
// developers.trendyol.com — Ürün Yaratma v2 öncesi kategori ağacı
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { categoryTreeUrl } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });

  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol." });
  }

  try {
    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
    const storeFrontCode = process.env.TRENDYOL_STORE_FRONT_CODE || "TR";
    const userAgent = process.env.TRENDYOL_USER_AGENT || `${creds.supplierId || "SatisTakip"}`;
    const fetchRes = await fetch(categoryTreeUrl(), {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "User-Agent": userAgent,
        storeFrontCode,
      },
      cache: "no-store",
    });
    const data = await fetchRes.json();
    if (!fetchRes.ok) {
      return res
        .setHeader("Cache-Control", "no-store, no-cache, must-revalidate")
        .status(fetchRes.status)
        .json({ success: false, message: data?.message || data?.error || "Kategori ağacı alınamadı" });
    }
    return res
      .setHeader("Cache-Control", "no-store, no-cache, must-revalidate")
      .status(200)
      .json({ success: true, categories: data });
  } catch (e) {
    console.error("Trendyol category tree error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
}
