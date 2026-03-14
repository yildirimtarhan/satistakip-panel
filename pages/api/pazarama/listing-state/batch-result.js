/**
 * Pazarama ürün kapama-açma toplu işlem sonucu
 * GET listing-state/batch-id/{batchId}/lake-projections
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetListingStateBatchResult } from "@/lib/marketplaces/pazaramaService";

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

  const { batchId, page = "1", pageSize = "10", lakeType = "1" } = req.query || {};
  if (!batchId || !String(batchId).trim()) {
    return res.status(400).json({ success: false, error: "batchId zorunlu (bulkUpdateProductStatusFromApi cevabından)." });
  }

  try {
    const data = await pazaramaGetListingStateBatchResult(creds, batchId, {
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 10,
      lakeType: parseInt(lakeType, 10) || 1,
    });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? { data: [], totalCount: 0, pageIndex: 1, pageSize: 10 },
    });
  } catch (err) {
    console.error("[Pazarama] Kapama-açma sonucu:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
