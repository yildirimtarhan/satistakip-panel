/**
 * Hepsiburada mağaza bazlı tüm katalog (SKU, varyant, marka, özellikler).
 * GET ?page=0&size=100&barcode=&merchantSku=&hbSku=
 * Doküman: https://developers.hepsiburada.com/hepsiburada/reference/getallproductsbymerchantid
 * Not: Sadece katalog entegrasyonundan yüklenen ürünler; HB kataloğundan açılanlar dahil değil.
 */
import jwt from "jsonwebtoken";
import axios from "axios";
import { getHBSettings, getHBToken, hbApiHeaders } from "@/lib/marketplaces/hbService";

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
    const { page = 0, size = 100, barcode, merchantSku, hbSku } = req.query;

    const url = `${cfg.baseUrl}/product/api/products/all-products-of-merchant/${encodeURIComponent(cfg.merchantId)}`;
    const params = { page: Number(page), size: Math.min(Number(size) || 100, 1000) };
    if (barcode) params.barcode = barcode;
    if (merchantSku) params.merchantSku = merchantSku;
    if (hbSku) params.hbSku = hbSku;

    const response = await axios.get(url, {
      params,
      headers: hbApiHeaders(cfg, tokenObj),
      timeout: 30000,
    });

    const raw = response.data;
    const data = raw?.data ?? raw?.content ?? (Array.isArray(raw) ? raw : []);

    return res.json({
      success: true,
      data,
      totalElements: raw?.totalElements ?? data.length,
      totalPages: raw?.totalPages ?? 1,
      number: raw?.number ?? Number(page),
      size: params.size,
      testMode: cfg.testMode,
    });
  } catch (err) {
    const detail = err?.response?.data;
    console.error("HB ALL-PRODUCTS ERROR:", JSON.stringify(detail || err.message));
    return res.status(500).json({
      success: false,
      message: detail?.message || detail?.description || err.message,
      detail,
    });
  }
}
