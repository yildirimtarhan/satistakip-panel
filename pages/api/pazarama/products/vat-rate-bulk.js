/**
 * Pazarama toplu KDV oranı güncelleme
 * PUT product/vatRate/bulk
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaBulkUpdateVatRate } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).json({ success: false, message: "Sadece PUT" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token gerekli" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const creds = await getPazaramaCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({ success: false, error: "Pazarama API bilgileri eksik." });
  }

  const { listingVatRates } = req.body || {};
  if (!Array.isArray(listingVatRates) || listingVatRates.length === 0) {
    return res.status(400).json({ success: false, error: "listingVatRates dizisi zorunlu." });
  }

  try {
    const data = await pazaramaBulkUpdateVatRate(creds, listingVatRates);
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
      message: data?.userMessage ?? data?.message,
    });
  } catch (err) {
    console.error("[Pazarama] KDV oranı güncelleme:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
