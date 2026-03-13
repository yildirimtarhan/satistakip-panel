/**
 * GET: Müşteri soruları | PUT: Soru cevapla
 */
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { questionsFilterUrl, questionAnswerUrl } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  const creds = await getTrendyolCredentials(req);
  if (!creds) return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik." });

  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    "User-Agent": process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0",
    "Content-Type": "application/json",
  };

  if (req.method === "GET") {
    const { page = 0, size = 20, status } = req.query;
    const now = Date.now();
    const start = now - 7 * 24 * 60 * 60 * 1000; // son 7 gün (max 2 hafta)
    let url = `${questionsFilterUrl(creds.supplierId)}?page=${page}&size=${size}&startDate=${start}&endDate=${now}`;
    if (status) url += `&status=${status}`;
    try {
      const r = await fetch(url, { headers });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return res.status(r.status).json({
          success: false,
          message: data?.message || "Sorular alınamadı. Soru-Cevap rolü gerekebilir.",
          detail: data,
        });
      }
      const list = data?.content ?? data?.questions ?? (Array.isArray(data) ? data : []);
      return res.status(200).json({ success: true, questions: list, ...data });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  if (req.method === "PUT" || req.method === "POST") {
    const { questionId, answer, text } = req.body;
    const answerText = answer || text;
    if (!questionId || !answerText) {
      return res.status(400).json({ success: false, message: "questionId ve answer (veya text) gerekli." });
    }
    const url = questionAnswerUrl(creds.supplierId, questionId);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: String(answerText).slice(0, 2000) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return res.status(r.status).json({
          success: false,
          message: data?.message || "Cevap gönderilemedi.",
          detail: data,
        });
      }
      return res.status(200).json({ success: true, message: "Cevap gönderildi", data });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  return res.status(405).json({ success: false, message: "GET veya PUT/POST" });
}
