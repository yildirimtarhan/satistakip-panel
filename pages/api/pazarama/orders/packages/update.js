/**
 * Pazarama paket güncelle (satıcı adresi / kargo firması)
 * PUT order/update-packages
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpdatePackages } from "@/lib/marketplaces/pazaramaService";

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

  const { packages } = req.body || {};
  if (!Array.isArray(packages) || packages.length === 0) {
    return res.status(400).json({ success: false, error: "packages dizisi zorunlu." });
  }

  try {
    const data = await pazaramaUpdatePackages(creds, packages);
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Paket güncelleme:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
