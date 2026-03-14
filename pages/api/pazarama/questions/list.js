/**
 * Pazarama sorulmuş soruları filtrele (detaylı)
 * GET QuestionAnswer/getApprovalAnswersByMerchant
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetApprovalAnswersByMerchant } from "@/lib/marketplaces/pazaramaService";

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

  const { pageIndex = "1", pageSize = "10", questionStatus } = req.query || {};

  try {
    const data = await pazaramaGetApprovalAnswersByMerchant(creds, {
      pageIndex: parseInt(pageIndex, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 10,
      questionStatus: questionStatus != null ? questionStatus : null,
    });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Sorulmuş sorular:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
