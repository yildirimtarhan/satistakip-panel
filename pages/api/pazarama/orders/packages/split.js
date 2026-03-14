/**
 * Pazarama paket oluştur / böl
 * POST order/api/packages-split
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaPostPackagesSplit } from "@/lib/marketplaces/pazaramaService";

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

  const { orderId, sellerId, apiOrderItemPackages } = req.body || {};
  if (!orderId) return res.status(400).json({ success: false, error: "orderId zorunlu." });
  if (!Array.isArray(apiOrderItemPackages) || apiOrderItemPackages.length === 0) {
    return res.status(400).json({ success: false, error: "apiOrderItemPackages zorunlu." });
  }

  try {
    const data = await pazaramaPostPackagesSplit(creds, { orderId, sellerId, apiOrderItemPackages });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Paket bölme:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
