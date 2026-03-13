/**
 * Hepsiburada Talep (Claims) API
 * GET: Talep listesi | POST: Kabul / Red
 */
import jwt from "jsonwebtoken";
import { getHBSettings, getHBToken } from "@/lib/marketplaces/hbService";
import { getClaimsListUrl, getClaimAcceptUrl, getClaimRejectUrl } from "@/lib/hepsiburadaConfig";

const CLAIM_STATUSES = [
  "NewRequest",
  "Accepted",
  "AwaitingAction",
  "InDispute",
  "Rejected",
  "Refunded",
  "Cancelled",
];

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

    if (req.method === "GET") {
      const status = req.query.status || "NewRequest";
      const offset = req.query.offset ?? 0;
      const limit = req.query.limit ?? 100;
      const baseUrl = getClaimsListUrl(cfg.merchantId, status, cfg.testMode);
      const url = `${baseUrl}?offset=${offset}&limit=${limit}`;
      const r = await fetch(url, { headers });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        return res.status(r.status).json({
          success: false,
          message: data?.message || "Talepler alınamadı.",
          detail: data,
        });
      }

      const list = data?.content ?? data?.data ?? (Array.isArray(data) ? data : []);
      return res.status(200).json({ success: true, claims: list, ...data });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const { claimNumber, action, reason, merchantStatement } = body;

      if (!claimNumber || !action) {
        return res.status(400).json({ success: false, message: "claimNumber ve action (accept/reject) gerekli." });
      }

      if (action === "accept") {
        const url = getClaimAcceptUrl(claimNumber, cfg.testMode);
        const r = await fetch(url, { method: "POST", headers, body: JSON.stringify({}) });
        if (r.status === 204 || r.ok) {
          return res.status(200).json({ success: true, message: "Talep kabul edildi." });
        }
        const err = await r.json().catch(() => ({}));
        return res.status(r.status).json({ success: false, message: err?.message || "Kabul işlemi başarısız.", detail: err });
      }

      if (action === "reject") {
        const url = getClaimRejectUrl(claimNumber, cfg.testMode);
        const payload = {};
        if (reason) payload.ClaimRejectionReason = String(reason);
        if (merchantStatement) payload.MerchantStatement = String(merchantStatement);
        const r = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (r.status === 204 || r.ok) {
          return res.status(200).json({ success: true, message: "Talep reddedildi." });
        }
        const err = await r.json().catch(() => ({}));
        return res.status(r.status).json({ success: false, message: err?.message || "Red işlemi başarısız.", detail: err });
      }

      return res.status(400).json({ success: false, message: "action: accept veya reject olmalı." });
    }

    return res.status(405).json({ success: false, message: "GET veya POST" });
  } catch (e) {
    if (e.name === "JsonWebTokenError") return res.status(401).json({ success: false, message: "Oturum gerekli." });
    return res.status(500).json({ success: false, message: e.message });
  }
}
