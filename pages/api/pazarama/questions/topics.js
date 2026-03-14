/**
 * Pazarama soru konuları (Satıcıya Soru Sor)
 * POST QuestionAnswer/questionTopics
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetQuestionTopics } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ message: "Sadece GET veya POST destekleniyor" });

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
    const data = await pazaramaGetQuestionTopics(creds);
    const list = data?.data || data || [];
    return res.status(200).json({
      success: data?.success !== false,
      data: list,
    });
  } catch (err) {
    console.error("[Pazarama] Soru konuları hatası:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
