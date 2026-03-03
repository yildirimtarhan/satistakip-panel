/**
 * Hepsiburada katalogdan marka listesi (ve isteğe bağlı model/kapasite değerleri).
 * GET /api/hepsiburada/catalog/brands
 * GET /api/hepsiburada/catalog/brands?withAttributes=1  → marka + model + kapasite benzeri özellik değerleri
 * Marka: all-products-of-merchant yanıtlarındaki unique brand alanından türetilir.
 */
import jwt from "jsonwebtoken";
import axios from "axios";
import { getHBSettings, getHBToken, hbApiHeaders } from "@/lib/marketplaces/hbService";

const MAX_PAGES = 20;
const PAGE_SIZE = 500;

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

    const withAttributes = req.query.withAttributes === "1" || req.query.withAttributes === "true";
    const tokenObj = await getHBToken(cfg);
    const url = `${cfg.baseUrl}/product/api/products/all-products-of-merchant/${encodeURIComponent(cfg.merchantId)}`;

    const brands = new Set();
    const attributeValues = {}; // { "model": Set, "kapasite": Set, "Model": Set, ... }

    let page = 0;
    let totalElements = 99999;

    while (page < MAX_PAGES && (page === 0 || (page * PAGE_SIZE) < totalElements)) {
      const response = await axios.get(url, {
        params: { page, size: PAGE_SIZE },
        headers: hbApiHeaders(cfg, tokenObj),
        timeout: 25000,
      });
      const raw = response.data;
      const list = raw?.data ?? raw?.content ?? (Array.isArray(raw) ? raw : []);
      totalElements = raw?.totalElements ?? list.length;

      for (const p of list) {
        if (p.brand) brands.add(String(p.brand).trim());
        if (!withAttributes) continue;
        const attrs = [
          ...(p.productAttributes || []),
          ...(p.baseAttributes || []),
          ...(p.variantTypeAttributes || []),
        ];
        for (const a of attrs) {
          const name = (a.name || a.attributeName || "").trim();
          const value = (a.value || a.attributeValue || "").trim();
          if (!name || !value) continue;
          if (!attributeValues[name]) attributeValues[name] = new Set();
          attributeValues[name].add(value);
        }
      }
      if (list.length < PAGE_SIZE) break;
      page++;
    }

    const out = {
      success: true,
      brands: Array.from(brands).filter(Boolean).sort((a, b) => a.localeCompare(b, "tr")),
      totalProductsScanned: page * PAGE_SIZE,
      testMode: cfg.testMode,
    };
    if (withAttributes) {
      const attrsOut = {};
      for (const [name, set] of Object.entries(attributeValues)) {
        attrsOut[name] = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, "tr"));
      }
      out.attributes = attrsOut;
      // Yaygın alan adları için kısayol (model, kapasite)
      out.model = attrsOut["Model"] || attrsOut["model"] || [];
      out.kapasite = attrsOut["Kapasite"] || attrsOut["kapasite"] || attrsOut["Bellek Kapasitesi"] || [];
    }

    return res.json(out);
  } catch (err) {
    const detail = err?.response?.data;
    console.error("HB BRANDS ERROR:", JSON.stringify(detail || err.message));
    return res.status(500).json({
      success: false,
      message: detail?.message || detail?.description || err.message,
      detail,
    });
  }
}
