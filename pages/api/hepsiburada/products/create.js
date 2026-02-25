import jwt from "jsonwebtoken";
import axios from "axios";
import { getHBSettings, getHBToken, hbApiHeaders } from "@/lib/marketplaces/hbService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.authToken) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID veya auth token eksik. API Ayarlarindan girin ya da HEPSIBURADA_AUTH env var tanimlayin.",
      });
    }

    const { product } = req.body;
    if (!product) return res.status(400).json({ success: false, message: "product verisi zorunlu" });

    const tokenObj = await getHBToken(cfg);

    const images = (product.images || []).filter((u) => u?.startsWith("http"));

    // HB düz katalog formatı — /api/products endpoint'i
    const body = [{
      merchant:        cfg.merchantId,
      merchantSku:     product.stockCode || product.barcode,
      stockCode:       product.stockCode || product.barcode,
      barcode:         product.barcode,
      productName:     product.title,
      brand:           product.brandName || "",
      categoryId:      Number(product.categoryId),
      description:     product.description || product.title,
      guaranteePeriod: product.guaranteePeriod || "24",
      quantity:        String(product.stock ?? 1),
      listPrice:       String(product.listPrice || product.price || 0).replace(".", ","),
      salePrice:       String(product.price || 0).replace(".", ","),
      vatRate:         Number(product.vatRate ?? 18),
      dimensionalWeight: product.dimensionalWeight || "0",
      cargoCompany1:   product.cargoCompany1 || "ups",
      cargoCompany2:   product.cargoCompany2 || "aras",
      cargoCompany3:   product.cargoCompany3 || "mng",
      images,
      attributes:      product.hbAttributes || {},
    }];

    // Doğru URL: /api/products (prefix yok)
    const url = `${cfg.baseUrl}/api/products`;
    console.log("HB CREATE URL:", url, "| categoryId:", product.categoryId, "| merchantId:", cfg.merchantId);
    console.log("HB BODY:", JSON.stringify(body));

    const response = await axios.post(url, body, {
      headers: hbApiHeaders(cfg, tokenObj),
      timeout: 20000,
    });

    return res.json({
      success: true,
      data: response.data,
      message: cfg.testMode ? "Hepsiburada TEST ortamina gonderildi." : "Hepsiburada'ya gonderildi.",
      testMode: cfg.testMode,
    });
  } catch (err) {
    const hbErr = err?.response?.data;
    console.error("HB CREATE ERROR:", JSON.stringify(hbErr || err.message));
    return res.status(500).json({
      success: false,
      message: hbErr?.description || hbErr?.errors?.[0] || hbErr?.message || err.message,
      detail: hbErr,
    });
  }
}
