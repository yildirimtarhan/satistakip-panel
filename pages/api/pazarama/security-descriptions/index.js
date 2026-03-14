/**
 * Pazarama uyarı görselleri: oluştur (onaya gider), onaylananları listele
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import {
  pazaramaCreateSecurityDescription,
  pazaramaGetApprovedSecurityDescriptions,
} from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
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

  if (req.method === "GET") {
    const { pageIndex = "1", pageSize = "100" } = req.query || {};
    try {
      const data = await pazaramaGetApprovedSecurityDescriptions(creds, {
        pageIndex: parseInt(pageIndex, 10) || 1,
        pageSize: parseInt(pageSize, 10) || 100,
      });
      return res.status(200).json({
        success: data?.success !== false,
        data: data?.data ?? [],
        pageIndex: data?.pageIndex,
        pageSize: data?.pageSize,
        totalCount: data?.totalCount,
        totalPages: data?.totalPages,
      });
    } catch (err) {
      console.error("[Pazarama] Uyarı görselleri listesi:", err.message);
      return res.status(502).json({ success: false, error: err.message });
    }
  }

  if (req.method === "POST") {
    const { content, imageUrl } = req.body || {};
    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, error: "content zorunlu." });
    }
    if (!imageUrl || !String(imageUrl).trim()) {
      return res.status(400).json({ success: false, error: "imageUrl (CDN linki) zorunlu." });
    }
    try {
      const data = await pazaramaCreateSecurityDescription(creds, { content, imageUrl });
      return res.status(200).json({
        success: data?.success !== false,
        data: data?.data ?? null,
      });
    } catch (err) {
      console.error("[Pazarama] Uyarı görseli ekleme:", err.message);
      return res.status(502).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, message: "Sadece GET veya POST" });
}
