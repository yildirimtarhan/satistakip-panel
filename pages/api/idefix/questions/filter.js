import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetQuestionFilter } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix müşteri soruları (pim/vendor/{vendorId}/question/filter)
 * Query: page (default 1), limit (default 10, max 50), barcode, startDate (timestamp ms), endDate (timestamp ms), sort (newest|oldest)
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri veya Satıcı ID eksik. API Ayarları → İdefix.",
      questions: [],
    });
  }

  const { page, limit, barcode, startDate, endDate, sort } = req.query || {};
  const params = {};
  if (page != null) params.page = Number(page) || 1;
  if (limit != null) params.limit = Math.min(50, Math.max(1, Number(limit) || 10));
  if (barcode != null && String(barcode).trim()) params.barcode = String(barcode).trim();
  if (startDate != null) params.startDate = Number(startDate);
  if (endDate != null) params.endDate = Number(endDate);
  if (sort === "oldest" || sort === "newest") params.sort = sort;

  try {
    const questions = await idefixGetQuestionFilter(creds, params);
    return res.status(200).json({
      success: true,
      questions: Array.isArray(questions) ? questions : [],
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      questions: [],
    });
  }
}
