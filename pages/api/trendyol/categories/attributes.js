// 📁 /api/trendyol/categories/attributes.js — getCategoryAttributes v2
// developers.trendyol.com — Kategori Özellik Listesi v2
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { categoryAttributesV2Url } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });

  const { categoryId } = req.query;
  if (!categoryId) {
    return res.status(400).json({ success: false, message: "categoryId parametresi gerekli" });
  }

  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol." });
  }

  try {
    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
    const storeFrontCode = process.env.TRENDYOL_STORE_FRONT_CODE || "TR";
    const fetchRes = await fetch(categoryAttributesV2Url(categoryId), {
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", storeFrontCode },
    });
    const data = await fetchRes.json();
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ success: false, message: data?.message || "Kategori özellikleri alınamadı" });
    }
    return res.status(200).json({
      success: true,
      id: data.id,
      name: data.name,
      displayName: data.displayName,
      categoryAttributes: data.categoryAttributes || [],
    });
  } catch (e) {
    console.error("Trendyol attributes error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
}
