/**
 * GET: Trendyol iade listesi
 */
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { returnsUrl } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Sadece GET" });
  const creds = await getTrendyolCredentials(req);
  if (!creds) return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik." });

  const { page = 0, size = 20, startDate, endDate } = req.query;
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : now - 14 * 24 * 60 * 60 * 1000;
  const end = endDate ? new Date(endDate).getTime() : now;
  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const url = `${returnsUrl(creds.supplierId)}?page=${page}&size=${size}&startDate=${start}&endDate=${end}`;

  try {
    const storeFrontCode = process.env.TRENDYOL_STORE_FRONT_CODE || "TR";
    const r = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0",
        "Content-Type": "application/json",
        storeFrontCode,
      },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        success: false,
        message: data?.message || "İade listesi alınamadı. İade rolü gerekebilir.",
        detail: data,
      });
    }
    const list = data?.content ?? data?.returns ?? (Array.isArray(data) ? data : []);
    return res.status(200).json({ success: true, returns: list, ...data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
