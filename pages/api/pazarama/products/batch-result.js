/**
 * Pazarama ürün batch işlem sonucu (batchRequestId ile sorgu)
 * GET product/getProductBatchResult?BatchRequestId=...
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import {
  pazaramaGetProductBatchResult,
  PAZARAMA_BATCH_STATUS,
} from "@/lib/marketplaces/pazaramaService";

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

  const { batchRequestId } = req.query;
  if (!batchRequestId) {
    return res.status(400).json({ success: false, error: "batchRequestId zorunlu." });
  }

  try {
    const data = await pazaramaGetProductBatchResult(creds, batchRequestId);
    const result = data?.data ?? {};
    return res.status(200).json({
      success: true,
      data: result,
      statusLabel: PAZARAMA_BATCH_STATUS[result.status] ?? result.status,
    });
  } catch (err) {
    console.error("[Pazarama] Batch result hatası:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
