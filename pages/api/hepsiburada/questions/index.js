/**
 * Hepsiburada Soru Cevap (Satıcıya Sor)
 * GET: Soru listesi | POST: Soru cevapla | POST reject: Sorun bildir
 * Base: api-asktoseller-merchant(-sit).hepsiburada.com
 */
import jwt from "jsonwebtoken";
import { getHBSettings, getHBToken } from "@/lib/marketplaces/hbService";
import { getQuestionsBaseUrl } from "@/lib/hepsiburadaConfig";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.authToken) {
      return res.status(400).json({ success: false, message: "Hepsiburada ayarları eksik." });
    }

    const tokenObj = await getHBToken(cfg);
    const headers = {
      Authorization: `${tokenObj.type} ${tokenObj.value}`,
      "User-Agent": cfg.userAgent || "SatisTakip/1.0",
      "Content-Type": "application/json",
      Accept: "application/json",
      merchantid: cfg.merchantId,
    };
    const base = getQuestionsBaseUrl(cfg.testMode);

    if (req.method === "GET") {
      const { page = 1, size = 20, status } = req.query;
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("size", String(size));
      params.set("sortBy", "0"); // 0: soru tarihi
      params.set("desc", "true");
      if (status) params.set("status", status); // 1=WaitingForAnswer, 2=Answered, 3=Rejected, 4=AutoClosed

      const url = `${base}/issues?${params.toString()}`;
      const r = await fetch(url, { headers });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        return res.status(r.status).json({
          success: false,
          message: data?.message || "Sorular alınamadı.",
          detail: data,
        });
      }

      const list = data?.content ?? data?.data ?? (Array.isArray(data) ? data : []);
      return res.status(200).json({ success: true, questions: list, ...data });
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const { questionId, issueNumber, answer, text, reject } = body;
      const qId = questionId ?? issueNumber;

      if (reject && qId) {
        // Sorun bildir: POST /api/v1.0/issues/{number}/reject
        const url = `${base}/issues/${qId}/reject`;
        const r = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ reason: body.reason || "Uygun değil" }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          return res.status(r.status).json({ success: false, message: data?.message || "Sorun bildirilemedi.", detail: data });
        }
        return res.status(200).json({ success: true, message: "Sorun bildirildi.", data });
      }

      const answerText = answer || text;
      if (!qId || !answerText) {
        return res.status(400).json({ success: false, message: "questionId (veya issueNumber) ve answer gerekli." });
      }

      // Soru cevapla: POST /api/v1.0/issues/{number}/answer (varsayılan)
      const url = `${base}/issues/${qId}/answer`;
      const r = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: String(answerText).slice(0, 2000) }),
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        return res.status(r.status).json({
          success: false,
          message: data?.message || "Cevap gönderilemedi. Endpoint farklı olabilir.",
          detail: data,
        });
      }
      return res.status(200).json({ success: true, message: "Cevap gönderildi.", data });
    }

    return res.status(405).json({ success: false, message: "GET veya POST" });
  } catch (e) {
    if (e.name === "JsonWebTokenError") return res.status(401).json({ success: false, message: "Oturum gerekli." });
    return res.status(500).json({ success: false, message: e.message });
  }
}
