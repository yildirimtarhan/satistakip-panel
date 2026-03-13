/**
 * GET: Satıcı (Supplier) bilgileri
 */
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { supplierAddressesUrl } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Sadece GET" });
  const creds = await getTrendyolCredentials(req);
  if (!creds) return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik." });

  const url = supplierAddressesUrl(creds.supplierId);
  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");

  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0",
        "Content-Type": "application/json",
      },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        success: false,
        message: data?.message || "Satıcı bilgisi alınamadı.",
        detail: data,
      });
    }
    return res.status(200).json({ success: true, supplier: data, addresses: Array.isArray(data) ? data : data?.addresses ?? [] });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
