/**
 * Pazarama kategori özellikleri (getCategoryWithAttributes)
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetCategoryWithAttributes } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Sadece GET destekleniyor" });

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

  const { categoryId } = req.query;
  if (!categoryId) {
    return res.status(400).json({ success: false, error: "categoryId zorunlu." });
  }

  try {
    const resp = await pazaramaGetCategoryWithAttributes(creds, categoryId);
    const raw = resp?.data ?? resp;
    const attrs = raw?.attributes ?? raw?.categoryAttributes ?? [];
    const list = Array.isArray(attrs) ? attrs : [];
    return res.status(200).json({ success: true, attributes: list, data: list });
  } catch (err) {
    console.error("[Pazarama] Kategori attributes hatası:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
