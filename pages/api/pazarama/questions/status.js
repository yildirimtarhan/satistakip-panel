/**
 * Pazarama Soru Statüleri (Satıcıya Soru Sor)
 * GET QuestionAnswer/getQuestionStatus
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import {
  pazaramaGetQuestionStatus,
  PAZARAMA_QUESTION_STATUS,
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

  try {
    const data = await pazaramaGetQuestionStatus(creds);
    const list = data?.data || data || [];
    return res.status(200).json({
      success: true,
      data: list,
      statusMap: PAZARAMA_QUESTION_STATUS,
    });
  } catch (err) {
    console.error("[Pazarama] Soru statü hatası:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
