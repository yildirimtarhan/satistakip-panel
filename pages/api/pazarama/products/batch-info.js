/**
 * Pazarama ürün parti/seri no ve son kullanma tarihi
 * POST product/upsertSellerProductBatchInfo
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpsertSellerProductBatchInfo } from "@/lib/marketplaces/pazaramaService";

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

  const { code, productBatchInfo } = req.body || {};
  if (!code || !String(code).trim()) {
    return res.status(400).json({ success: false, error: "code (barkod) zorunlu." });
  }

  try {
    const data = await pazaramaUpsertSellerProductBatchInfo(creds, {
      code: code.trim(),
      productBatchInfo,
    });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Parti bilgisi:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
