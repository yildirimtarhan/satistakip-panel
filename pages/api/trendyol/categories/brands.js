// 📁 /api/trendyol/categories/brands.js — getBrands
// developers.trendyol.com — Trendyol Marka Listesi
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { brandsUrl } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });

  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik." });
  }

  const page = req.query.page || 0;
  const size = req.query.size || 1000;

  try {
    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
    const url = `${brandsUrl()}?page=${page}&size=${size}`;
    const fetchRes = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    });
    const data = await fetchRes.json();
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ success: false, message: data?.message || "Marka listesi alınamadı" });
    }
    return res.status(200).json({ success: true, brands: data.brands || [] });
  } catch (e) {
    console.error("Trendyol brands error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
}
