/**
 * Hepsiburada listing envanter güncelleme (fiyat, stok).
 * POST .../listings/merchantid/{merchantId}/inventory-uploads
 * Body: array of { merchantSku?, hepsiburadaSku?, price?, availableStock?, ... }
 */
import jwt from "jsonwebtoken";
import axios from "axios";
import { getHBSettings, getHBToken } from "@/lib/marketplaces/hbService";

function getListingBaseUrl(testMode) {
  const env = process.env.HEPSIBURADA_LISTING_BASE_URL || process.env.HB_LISTING_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  return testMode
    ? "https://listing-external-sit.hepsiburada.com"
    : "https://listing-external.hepsiburada.com";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.authToken) {
      return res.status(400).json({ success: false, message: "Hepsiburada ayarları eksik" });
    }

    let merchantId = cfg.merchantId;
    try {
      const decodedAuth = Buffer.from(cfg.authToken.replace(/^Basic\s+/i, ""), "base64").toString("utf8");
      const user = decodedAuth.split(":")[0]?.trim();
      if (user) merchantId = user;
    } catch (_) {}

    const tokenObj = await getHBToken(cfg);
    const body = req.body;
    const items = Array.isArray(body) ? body : (body?.items ?? body?.listings ?? []);
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: "En az bir güncelleme kaydı gerekli (items dizisi)" });
    }

    const payload = items.map((item) => {
      const row = {};
      if (item.merchantSku != null) row.merchantSku = String(item.merchantSku);
      if (item.hepsiburadaSku != null) row.hepsiburadaSku = String(item.hepsiburadaSku);
      if (item.price != null) row.price = Number(item.price);
      if (item.availableStock != null) row.availableStock = Math.max(0, parseInt(item.availableStock, 10));
      if (item.cargoCompany1 != null) row.cargoCompany1 = String(item.cargoCompany1);
      if (item.cargoCompany2 != null) row.cargoCompany2 = String(item.cargoCompany2);
      if (item.cargoCompany3 != null) row.cargoCompany3 = String(item.cargoCompany3);
      return row;
    }).filter((r) => r.merchantSku || r.hepsiburadaSku);

    if (payload.length === 0) {
      return res.status(400).json({ success: false, message: "Her kayıtta merchantSku veya hepsiburadaSku gerekli" });
    }

    const base = getListingBaseUrl(cfg.testMode);
    const url = `${base}/listings/merchantid/${encodeURIComponent(merchantId)}/inventory-uploads`;

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `${tokenObj.type} ${tokenObj.value}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": cfg.userAgent || "SatisTakip/1.0",
      },
      timeout: 30000,
    });

    return res.json({
      success: true,
      data: response.data,
      message: `${payload.length} listing güncelleme isteği gönderildi`,
      testMode: cfg.testMode,
    });
  } catch (err) {
    const detail = err?.response?.data;
    console.error("HB LISTINGS UPDATE INVENTORY ERROR:", JSON.stringify(detail || err.message));
    return res.status(err?.response?.status || 500).json({
      success: false,
      message: detail?.message || detail?.description || err.message,
      detail,
    });
  }
}
