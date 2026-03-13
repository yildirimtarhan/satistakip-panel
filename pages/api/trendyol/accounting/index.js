/**
 * GET: Cari hesap ekstresi (muhasebe)
 */
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { settlementsUrl } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Sadece GET" });
  const creds = await getTrendyolCredentials(req);
  if (!creds) return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik." });

  const { startDate, endDate, transactionType = "Sale" } = req.query;
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : now - 15 * 24 * 60 * 60 * 1000;
  const end = endDate ? new Date(endDate).getTime() : now;
  // Max 15 gün aralık, transactionType: Sale, Return, Discount, Coupon, ProvisionPositive, PaymentOrder vb.
  const url = `${settlementsUrl(creds.supplierId)}?startDate=${start}&endDate=${end}&transactionType=${encodeURIComponent(transactionType)}&page=0&size=500&supplierId=${creds.supplierId}`;

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
        message: data?.message || "Cari ekstre alınamadı. Muhasebe rolü gerekebilir.",
        detail: data,
      });
    }
    const items = data?.content ?? (Array.isArray(data) ? data : []);
    return res.status(200).json({ success: true, statements: items, ...data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
