import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetQuestionById } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix ürün sorusu detayı (pim/vendor/{vendorId}/question/{questionId})
 * Tek bir soruyu ID ile getirir. Path: /api/idefix/questions/[questionId]
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const questionId = req.query.questionId ?? "";
  if (!String(questionId).trim()) {
    return res.status(400).json({
      success: false,
      message: "questionId zorunludur. Path: /api/idefix/questions/[questionId]",
      items: [],
      totalCount: 0,
    });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri veya Satıcı ID eksik. API Ayarları → İdefix.",
      items: [],
      totalCount: 0,
    });
  }

  try {
    const data = await idefixGetQuestionById(creds, questionId);
    return res.status(200).json({
      success: true,
      totalCount: data.totalCount,
      itemCount: data.itemCount,
      pageCount: data.pageCount,
      currentPage: data.currentPage,
      limit: data.limit,
      items: data.items,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      items: [],
      totalCount: 0,
    });
  }
}
