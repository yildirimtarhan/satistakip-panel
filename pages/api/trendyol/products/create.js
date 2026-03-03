import jwt from "jsonwebtoken";
import axios from "axios";
import dbConnect from "@/lib/dbConnect";
import Settings from "@/models/Settings";
import { productCreateUrl } from "@/lib/marketplaces/trendyolConfig";

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

    const credentials = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64");
    const createUrl = productCreateUrl(cfg.supplierId);

    const item = {
      barcode: product.barcode,
      title: product.title,
      productMainId: product.productMainId || product.barcode,
      brandId: Number(product.brandId),
      categoryId: Number(product.categoryId),
      quantity: Number(product.quantity ?? 0),
      stockCode: product.stockCode || product.barcode,
      description: product.description || product.title,
      currencyType: "TRY",
      listPrice: Number(product.listPrice),
      salePrice: Number(product.salePrice),
      vatRate: Number(product.vatRate ?? 20),
      cargoCompanyId: Number(product.cargoCompanyId ?? 10),
      images: (product.images || []).map((url) => ({ url })),
      attributes: product.attributes || [],
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
