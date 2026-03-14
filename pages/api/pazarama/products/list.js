/**
 * Pazarama ürün filtreleme (onaylanmış / onaylanmamış)
 * GET product/products?Approved=true|false&Code=...&Page=1&Size=250
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetProducts } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Sadece GET" });

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

  const { approved = "true", code = "", page = "1", size = "250" } = req.query || {};

  try {
    const data = await pazaramaGetProducts(creds, {
      approved: approved === "true" || approved === true,
      code: String(code || "").trim(),
      page: parseInt(page, 10) || 1,
      size: Math.min(parseInt(size, 10) || 250, 250),
    });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? [],
      message: data?.message ?? data?.userMessage,
    });
  } catch (err) {
    console.error("[Pazarama] Ürün listesi hatası:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
