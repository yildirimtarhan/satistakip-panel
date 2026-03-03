/**
 * Hepsiburada listing bilgileri (fiyat, stok, kargo, merchantSku, hepsiburadaSku).
 * GET ?page=0&size=100
 * Listeleme Entegrasyonu – Listing Bilgilerini Sorgulama (pagination zorunlu).
 * Test: mpop-sit veya listing-external-sit; canlı: mpop / listing-external
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
  if (req.method !== "GET") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.authToken) {
      return res.status(400).json({ success: false, message: "Hepsiburada ayarları eksik" });
    }

    const tokenObj = await getHBToken(cfg);
    const page = Math.max(0, parseInt(req.query.page, 10) || 0);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size, 10) || 20));
    const offset = page * size;
    const limit = size;

    // Listing API: URL'deki merchantId ile Basic Auth'taki userName AYNI olmalı (401 yoksa farklıydı)
    let listingMerchantId = cfg.merchantId;
    try {
      const decoded = Buffer.from(cfg.authToken.replace(/^Basic\s+/i, ""), "base64").toString("utf8");
      const basicUser = decoded.split(":")[0]?.trim();
      if (basicUser) listingMerchantId = basicUser;
    } catch (_) {}

    const listingBase = getListingBaseUrl(cfg.testMode);
    const url = `${listingBase}/listings/merchantid/${encodeURIComponent(listingMerchantId)}`;
    const authHeader = `${tokenObj.type} ${tokenObj.value}`;

    // Resmi API: offset ve limit zorunlu (page/size değil) – "Pagination Limit should be provided"
    const response = await axios.get(url, {
      params: { offset, limit },
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": cfg.userAgent,
      },
      timeout: 20000,
    });

    const raw = response.data;
    const data = raw?.listings ?? raw?.content ?? raw?.data ?? (Array.isArray(raw) ? raw : []);

    return res.json({
      success: true,
      data: Array.isArray(data) ? data : [data],
      totalElements: raw?.totalCount ?? raw?.totalElements ?? raw?.total ?? 0,
      number: page,
      size: limit,
      offset,
      limit,
      testMode: cfg.testMode,
    });
  } catch (err) {
    const detail = err?.response?.data;
    console.error("HB LISTINGS LIST ERROR:", JSON.stringify(detail || err.message));
    return res.status(500).json({
      success: false,
      message: detail?.message || detail?.description || err.message,
      detail,
    });
  }
}
