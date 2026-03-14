/**
 * Pazarama ürün güvenlik belgeleri (kullanım kılavuzu, ön/arka ambalaj)
 * POST product/upsertSellerProductSecurityDocuments
 * type: 1=PDF kılavuz, 2=ön ambalaj, 3=arka ambalaj
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpsertSellerProductSecurityDocuments } from "@/lib/marketplaces/pazaramaService";

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

  const { code, productSecurityDocument } = req.body || {};
  if (!code || !String(code).trim()) {
    return res.status(400).json({ success: false, error: "code (barkod) zorunlu." });
  }
  if (!Array.isArray(productSecurityDocument) || productSecurityDocument.length === 0) {
    return res.status(400).json({ success: false, error: "productSecurityDocument dizisi zorunlu." });
  }

  try {
    const data = await pazaramaUpsertSellerProductSecurityDocuments(creds, {
      code: code.trim(),
      productSecurityDocument,
    });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Güvenlik belgeleri:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
