/**
 * Pazarama ürün max satış stok adedi güncelleme
 * POST product/upsertSellerProductSaleLimit
 * Quantity: 0 = sınırsız, 1+ = siparişte max alınabilecek adet
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpsertSellerProductSaleLimit } from "@/lib/marketplaces/pazaramaService";

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

  const { code, Quantity } = req.body || {};
  if (!code || !String(code).trim()) {
    return res.status(400).json({ success: false, error: "code (barkod) zorunlu." });
  }

  try {
    const data = await pazaramaUpsertSellerProductSaleLimit(creds, {
      code: String(code).trim(),
      Quantity: Quantity != null ? Number(Quantity) : 0,
    });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Max satış stok adedi:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
