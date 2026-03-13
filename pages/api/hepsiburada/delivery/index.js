/**
 * Hepsiburada Teslimat API — deliver, undeliver, intransit
 * POST body: { action, packageNumber, ... } — merchantId otomatik alınır
 */
import jwt from "jsonwebtoken";
import { getHBSettings, getHBToken } from "@/lib/marketplaces/hbService";
import {
  getPackageDeliverUrl,
  getPackageUndeliverUrl,
  getPackageIntransitUrl,
} from "@/lib/hepsiburadaConfig";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Sadece POST" });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.authToken) {
      return res.status(400).json({ success: false, message: "Hepsiburada ayarları eksik." });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { action, packageNumber } = body;

    if (!action || !packageNumber) {
      return res.status(400).json({
        success: false,
        message: "action (deliver|undeliver|intransit) ve packageNumber gerekli.",
      });
    }

    const tokenObj = await getHBToken(cfg);
    const headers = {
      Authorization: `${tokenObj.type} ${tokenObj.value}`,
      "User-Agent": cfg.userAgent || "SatisTakip/1.0",
      "Content-Type": "application/json",
      Accept: "application/json",
      merchantid: cfg.merchantId,
    };

    let url;
    let payload = { merchantId: cfg.merchantId, packageNumber };

    if (action === "deliver") {
      url = getPackageDeliverUrl(cfg.merchantId, packageNumber, cfg.testMode);
      const now = new Date().toISOString();
      payload = {
        merchantId: cfg.merchantId,
        receivedDate: body.receivedDate || now,
        receivedBy: body.receivedBy || "Müşteri",
        packageNumber,
        barcode: body.barcode || "",
      };
    } else if (action === "undeliver") {
      url = getPackageUndeliverUrl(cfg.merchantId, packageNumber, cfg.testMode);
      const now = new Date().toISOString();
      payload = {
        merchantId: cfg.merchantId,
        undeliveredDate: body.undeliveredDate || now,
        packageNumber,
        barcode: body.barcode || "",
      };
    } else if (action === "intransit") {
      url = getPackageIntransitUrl(cfg.merchantId, packageNumber, cfg.testMode);
      const now = new Date().toISOString();
      payload = {
        merchantId: cfg.merchantId,
        shippedDate: body.shippedDate || now,
        packageNumber,
        barcode: body.barcode || "",
        trackingInfoCode: body.trackingInfoCode || body.trackingCode || "",
        trackingInfoUrl: body.trackingInfoUrl || "",
        deci: body.deci,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "action: deliver, undeliver veya intransit olmalı.",
      });
    }

    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (r.status === 204 || r.ok) {
      const labels = { deliver: "Teslim edildi", undeliver: "Teslim edilemedi", intransit: "Kargoya verildi" };
      return res.status(200).json({ success: true, message: `${labels[action]} bildirildi.` });
    }

    const err = await r.json().catch(() => ({}));
    return res.status(r.status).json({
      success: false,
      message: err?.message || "İşlem başarısız.",
      detail: err,
    });
  } catch (e) {
    if (e.name === "JsonWebTokenError") return res.status(401).json({ success: false, message: "Oturum gerekli." });
    return res.status(500).json({ success: false, message: e.message });
  }
}
