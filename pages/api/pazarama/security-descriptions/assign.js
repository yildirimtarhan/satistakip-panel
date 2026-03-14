/**
 * Pazarama ürüne uyarı görselleri ata (ekle/güncelle/sil)
 * code + securityDescriptionIds
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaAssignProductSecurityDescriptions } from "@/lib/marketplaces/pazaramaService";

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

  const { code, securityDescriptionIds } = req.body || {};
  if (!code || !String(code).trim()) {
    return res.status(400).json({ success: false, error: "code (barkod) zorunlu." });
  }

  try {
    const data = await pazaramaAssignProductSecurityDescriptions(creds, {
      code: code.trim(),
      securityDescriptionIds: Array.isArray(securityDescriptionIds) ? securityDescriptionIds : [],
    });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Ürün uyarı görseli:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
