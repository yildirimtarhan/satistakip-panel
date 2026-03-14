/**
 * Pazarama sorulmuş soruların yanıtlarını özet olarak filtrele
 * POST QuestionAnswer/getApprovalAnswersByMerchantSearch
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetApprovalAnswersByMerchantSearch } from "@/lib/marketplaces/pazaramaService";

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

  const {
    barcode = null,
    topicId = null,
    questionStartDate = null,
    questionEndDate = null,
    questionStatus = null,
    pageIndex = "1",
    pageSize = "10",
  } = req.body || {};

  try {
    const data = await pazaramaGetApprovalAnswersByMerchantSearch(creds, {
      barcode: barcode ?? null,
      topicId: topicId ?? null,
      questionStartDate: questionStartDate ?? null,
      questionEndDate: questionEndDate ?? null,
      questionStatus: questionStatus ?? null,
      pageIndex: parseInt(pageIndex, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 10,
    });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Soru yanıtları özeti:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
