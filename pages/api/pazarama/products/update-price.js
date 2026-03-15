/**
 * Pazarama toplu fiyat güncelleme
 * POST product/updatePrice-v2
 * body: { items: [{ code, listPrice, salePrice }] }
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpdatePrice } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST destekleniyor" });

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

  const items = req.body?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: "items dizisi zorunlu." });
  }

  try {
    const data = await pazaramaUpdatePrice(creds, items);
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
      message: data?.message ?? data?.userMessage ?? "Fiyat güncellemesi gönderildi.",
    });
  } catch (err) {
    console.error("[Pazarama] Fiyat güncelleme:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
