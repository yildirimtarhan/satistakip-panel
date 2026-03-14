/**
 * Pazarama hızlı ürün ekleme (katalogdan barkod ile)
 * POST product/addProductsWithBarcodes
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaAddProductsWithBarcodes } from "@/lib/marketplaces/pazaramaService";

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

  const { product } = req.body || {};
  if (!product?.productId) {
    return res.status(400).json({ success: false, error: "productId gerekli. Önce katalog sorgusu yapın." });
  }

  try {
    const data = await pazaramaAddProductsWithBarcodes(creds, product);
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
      message: data?.message ?? data?.userMessage,
    });
  } catch (err) {
    console.error("[Pazarama] Hızlı ürün ekleme hatası:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
