import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixAnswerQuestion } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix müşteri sorusuna cevap (pim/vendor/{vendorId}/question/{questionId}/answer)
 * Body: { answer_body: string }. Path: /api/idefix/questions/[questionId]/answer
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  const questionId = req.query.questionId ?? "";
  if (!String(questionId).trim()) {
    return res.status(400).json({
      success: false,
      message: "questionId zorunludur. Path: /api/idefix/questions/[questionId]/answer",
    });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri veya Satıcı ID eksik. API Ayarları → İdefix.",
    });
  }

  const { answer_body } = req.body || {};
  if (answer_body == null || String(answer_body).trim() === "") {
    return res.status(400).json({
      success: false,
      message: "answer_body (cevap metni) zorunludur.",
    });
  }

  try {
    const data = await idefixAnswerQuestion(creds, questionId, String(answer_body).trim());
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
