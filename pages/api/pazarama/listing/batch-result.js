/**
 * Pazarama fiyat/stok batch sonucu (updatePrice-v2 / updateStock-v2 dataId ile)
 * GET listing-state/batch-id/{dataId}/lake-projections
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetListingBatchResult } from "@/lib/marketplaces/pazaramaService";

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

  const { dataId, page = "1", pageSize = "3000" } = req.query;
  if (!dataId) {
    return res.status(400).json({ success: false, error: "dataId zorunlu (fiyat/stok update cevabındaki data değeri)." });
  }

  try {
    const data = await pazaramaGetListingBatchResult(
      creds,
      dataId,
      parseInt(page, 10) || 1,
      parseInt(pageSize, 10) || 3000
    );
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error("[Pazarama] Listing batch result hatası:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
