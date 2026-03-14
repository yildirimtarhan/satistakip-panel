/**
 * Pazarama ID ile sorulmuş sorunun detayını getir
 * GET QuestionAnswer/getApprovalAnswerById
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetApprovalAnswerById } from "@/lib/marketplaces/pazaramaService";

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

  const questionId = req.query?.questionId;
  if (!questionId) {
    return res.status(400).json({ success: false, error: "questionId gerekli." });
  }

  try {
    const data = await pazaramaGetApprovalAnswerById(creds, questionId);
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Soru detayı:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
