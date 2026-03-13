/**
 * Hepsiburada Muhasebe — Kayıt Bazlı Muhasebe Servisi
 * GET /transactions/merchantid/{merchantId}
 * Parametreler: offset, limit, status (Paid|WillBePaid), transactionTypes, paymentDateStart/End vb.
 */
import jwt from "jsonwebtoken";
import { getHBSettings, getHBToken } from "@/lib/marketplaces/hbService";
import { getTransactionsUrl } from "@/lib/hepsiburadaConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Sadece GET" });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.authToken) {
      return res.status(400).json({ success: false, message: "Hepsiburada ayarları eksik. API Ayarlarından Merchant ID ve şifre girin." });
    }

    const { offset = 0, limit = 100, status, transactionTypes } = req.query;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const paymentDateStart = req.query.paymentDateStart || start.toISOString().slice(0, 10);
    const paymentDateEnd = req.query.paymentDateEnd || now.toISOString().slice(0, 10);

    const params = new URLSearchParams();
    params.set("offset", String(offset));
    params.set("limit", String(Math.min(100, parseInt(limit, 10) || 100)));
    params.set("paymentDateStart", paymentDateStart);
    params.set("paymentDateEnd", paymentDateEnd);
    if (status) params.set("status", status); // Paid | WillBePaid
    if (transactionTypes) params.set("transactionTypes", transactionTypes);

    const url = `${getTransactionsUrl(cfg.merchantId, cfg.testMode)}?${params.toString()}`;
    const tokenObj = await getHBToken(cfg);

    const r = await fetch(url, {
      headers: {
        Authorization: `${tokenObj.type} ${tokenObj.value}`,
        "User-Agent": cfg.userAgent || "SatisTakip/1.0",
        "Content-Type": "application/json",
        Accept: "application/json",
        merchantid: cfg.merchantId,
      },
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        success: false,
        message: data?.message || "Muhasebe kayıtları alınamadı. Muhasebe yetkisi gerekebilir.",
        detail: data,
      });
    }

    const items = data?.content ?? data?.data ?? (Array.isArray(data) ? data : []);
    return res.status(200).json({ success: true, transactions: items, ...data });
  } catch (e) {
    if (e.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Oturum gerekli." });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
}
