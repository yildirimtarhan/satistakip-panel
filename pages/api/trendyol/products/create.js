import jwt from "jsonwebtoken";
import axios from "axios";
import dbConnect from "@/lib/dbConnect";
import Settings from "@/models/Settings";
import { productCreateV2Url } from "@/lib/marketplaces/trendyolConfig";

async function getTrendyolSettings({ companyId, userId }) {
  await dbConnect();
  let s = null;
  if (companyId) s = await Settings.findOne({ companyId });
  if (!s && userId) s = await Settings.findOne({ userId });
  const ty = s?.trendyol || {};
  return {
    supplierId: ty.supplierId || process.env.TRENDYOL_SUPPLIER_ID,
    apiKey: ty.apiKey || process.env.TRENDYOL_API_KEY,
    apiSecret: ty.apiSecret || process.env.TRENDYOL_API_SECRET,
    integrator: ty.integrator || "SatisTakip",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getTrendyolSettings({ companyId, userId });
    if (!cfg.supplierId || !cfg.apiKey || !cfg.apiSecret) {
      return res.status(400).json({ success: false, message: "Trendyol ayarları eksik (supplierId, apiKey, apiSecret)" });
    }

    const { product } = req.body;
    if (!product) return res.status(400).json({ success: false, message: "product verisi zorunlu" });

    const images = (product.images || []).slice(0, 8).map((url) => ({ url: String(url).trim() })).filter((img) => img.url && img.url.startsWith("https"));
    if (images.length === 0) return res.status(400).json({ success: false, message: "En az 1 HTTPS görsel URL zorunlu (Trendyol v2)" });
    if (!product.brandId || !product.categoryId) return res.status(400).json({ success: false, message: "brandId ve categoryId zorunlu" });

    const credentials = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64");
    const createUrl = productCreateV2Url(cfg.supplierId);

    // v2 API (developers.trendyol.com): vatRate 0,1,10,20; dimensionalWeight zorunlu
    const validVatRates = [0, 1, 10, 20];
    const vatRate = validVatRates.includes(Number(product.vatRate)) ? Number(product.vatRate) : 20;
    const listPrice = Number(product.listPrice || product.salePrice || 0);
    const salePrice = Number(product.salePrice || product.listPrice || 0);
    const item = {
      barcode: String(product.barcode || product.stockCode || "TRD-" + Date.now()).replace(/\s/g, "").slice(0, 40),
      title: String(product.title || "").slice(0, 100),
      productMainId: String(product.productMainId || product.barcode || product.stockCode || "TRD-" + Date.now()).slice(0, 40),
      brandId: Number(product.brandId),
      categoryId: Number(product.categoryId),
      quantity: Number(product.quantity ?? 0),
      stockCode: String(product.stockCode || product.barcode || "STK-" + Date.now()).slice(0, 100),
      dimensionalWeight: Number(product.dimensionalWeight ?? product.desi ?? 1),
      description: String(product.description || product.title || "").slice(0, 30000),
      listPrice: Math.max(listPrice, salePrice),
      salePrice,
      vatRate,
      images,
      attributes: Array.isArray(product.attributes) ? product.attributes : [],
    };

    const response = await axios.post(
      createUrl,
      { items: [item] },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
          "User-Agent": `${cfg.supplierId} - ${cfg.integrator}`,
        },
        timeout: 20000,
      }
    );

    return res.json({
      success: true,
      batchRequestId: response.data?.batchRequestId,
      message: "Trendyol gönderim kuyruğa alındı",
    });
  } catch (err) {
    const tyErr = err?.response?.data;
    console.error("TRENDYOL CREATE ERROR:", tyErr || err.message);
    return res.status(500).json({ success: false, message: tyErr?.message || err.message, detail: tyErr });
  }
}
