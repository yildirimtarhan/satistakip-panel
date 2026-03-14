/**
 * Pazarama kataloglu ürün satışa aç/kapat (toplu)
 * POST product/bulkUpdateProductStatusFromApi
 * productStatus: 1 = satışa aç, 10 = satışa kapat
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaBulkUpdateProductStatus } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Sadece POST" });

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

  const { productItems } = req.body || {};
  if (!Array.isArray(productItems) || productItems.length === 0) {
    return res.status(400).json({ success: false, error: "productItems dizisi zorunlu." });
  }

  try {
    const data = await pazaramaBulkUpdateProductStatus(creds, productItems);
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Toplu ürün satış durumu:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
