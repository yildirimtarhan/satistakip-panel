/**
 * Hepsiburada kargo firmaları listesi.
 * GET https://shipping-external-sit.hepsiburada.com/cargoFirms/{merchantId}
 * Test: shipping-external-sit; canlı: shipping-external
 */
import jwt from "jsonwebtoken";
import axios from "axios";
import { getHBSettings, getHBToken } from "@/lib/marketplaces/hbService";

function getShippingBaseUrl(testMode) {
  const env = process.env.HEPSIBURADA_SHIPPING_BASE_URL || process.env.HB_SHIPPING_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  return testMode
    ? "https://shipping-external-sit.hepsiburada.com"
    : "https://shipping-external.hepsiburada.com";
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

    let merchantId = cfg.merchantId;
    try {
      const decodedAuth = Buffer.from(cfg.authToken.replace(/^Basic\s+/i, ""), "base64").toString("utf8");
      const user = decodedAuth.split(":")[0]?.trim();
      if (user) merchantId = user;
    } catch (_) {}

    const tokenObj = await getHBToken(cfg);
    const base = getShippingBaseUrl(cfg.testMode);
    const url = `${base}/cargoFirms/${encodeURIComponent(merchantId)}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `${tokenObj.type} ${tokenObj.value}`,
        "User-Agent": cfg.userAgent || "SatisTakip/1.0",
        Accept: "application/json",
      },
      timeout: 10000,
    });

    const list = Array.isArray(response.data) ? response.data : [];
    const firms = list
      .filter((f) => f.cargoFirmName != null)
      .map((f) => ({
        id: f.cargoFirmId,
        name: f.cargoFirmName,
        displayOrder: f.cargoFirmDisplayOrder,
        visible: f.isVisible !== false,
      }))
      .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

    return res.json({ success: true, cargoFirms: firms });
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.warn("HB cargo-firms:", status, data || err.message);
    return res.status(status === 401 ? 401 : 500).json({
      success: false,
      message: data?.message || err.message,
      cargoFirms: [],
    });
  }
}
