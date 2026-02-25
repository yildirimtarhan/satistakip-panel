import jwt from "jsonwebtoken";
import axios from "axios";
import { getHBSettings, getHBToken, buildAuthHeader } from "@/lib/marketplaces/hbService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });

    if (!cfg.merchantId) {
      return res.status(400).json({ success: false, message: "Merchant ID eksik (HEPSIBURADA_MERCHANT_ID)" });
    }
    if (!cfg.authToken && (!cfg.username || !cfg.password)) {
      return res.status(400).json({ success: false, message: "Hepsiburada auth bilgileri eksik" });
    }

    const { product } = req.body;
    if (!product) return res.status(400).json({ success: false, message: "product verisi zorunlu" });

    const tokenObj = await getHBToken(cfg);
    const base = cfg.baseUrl;

    const images = (product.images || []).filter((u) => u?.startsWith("http"));
    const imageAttrs = {};
    images.slice(0, 5).forEach((url, i) => { imageAttrs[`Image${i + 1}`] = url; });

    const item = {
      categoryId: product.categoryId,
      merchant: cfg.merchantId,
      attributes: {
        Barcode: product.barcode,
        merchantSku: product.stockCode || product.barcode,
        UrunAdi: product.title,
        UrunAciklamasi: product.description || product.title,
        Marka: product.brandName || "",
        tax_vat_rate: String(product.vatRate ?? 18),
        ...imageAttrs,
        ...(product.hbAttributes || {}),
      },
    };

    const response = await axios.post(
      `${base}/products/api/products/${cfg.merchantId}`,
      [item],
      {
        headers: {
          Authorization: buildAuthHeader(tokenObj),
          "Content-Type": "application/json",
          "User-Agent": process.env.HEPSIBURADA_USER_AGENT || "SatisTakip/1.0",
        },
        timeout: 20000,
      }
    );

    return res.json({
      success: true,
      data: response.data,
      message: cfg.testMode ? "Hepsiburada TEST ortamina gonderildi." : "Hepsiburada'ya gonderildi.",
      testMode: cfg.testMode,
    });
  } catch (err) {
    const hbErr = err?.response?.data;
    console.error("HB CREATE ERROR:", hbErr || err.message);
    return res.status(500).json({
      success: false,
      message: hbErr?.description || hbErr?.message || err.message,
      detail: hbErr,
    });
  }
}
