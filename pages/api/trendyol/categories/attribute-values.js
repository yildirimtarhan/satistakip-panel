// 📁 /api/trendyol/categories/attribute-values.js — getCategoryAttributeValues v2
// developers.trendyol.com — Kategori Özellik Değerleri Listesi v2
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { categoryAttributeValuesUrl } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });

  const { categoryId, attributeId } = req.query;
  if (!categoryId || !attributeId) {
    return res.status(400).json({ success: false, message: "categoryId ve attributeId gerekli" });
  }

  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik." });
  }

  try {
    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
    const storeFrontCode = process.env.TRENDYOL_STORE_FRONT_CODE || "TR";
    const url = `${categoryAttributeValuesUrl(categoryId, attributeId)}?page=0&size=1000`;
    const fetchRes = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", storeFrontCode },
    });
    const data = await fetchRes.json();
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ success: false, message: data?.message || "Özellik değerleri alınamadı" });
    }
    const content = data.content || [];
    return res.status(200).json({ success: true, values: content });
  } catch (e) {
    console.error("Trendyol attribute values error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
}
