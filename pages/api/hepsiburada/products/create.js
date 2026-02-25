import jwt from "jsonwebtoken";
import axios from "axios";
import dbConnect from "@/lib/dbConnect";
import Settings from "@/models/Settings";

async function getHBSettings({ companyId, userId }) {
  await dbConnect();
  let s = null;
  if (companyId) s = await Settings.findOne({ companyId });
  if (!s && userId) s = await Settings.findOne({ userId });
  const hb = s?.hepsiburada || {};
  return {
    merchantId: hb.merchantId || process.env.HB_MERCHANT_ID,
    username: hb.username || process.env.HB_USERNAME,
    password: hb.password || process.env.HB_PASSWORD,
  };
}

async function getHBToken(username, password) {
  const res = await axios.post(
    "https://mpop.hepsiburada.com/api/authenticate",
    { username, password, authenticationType: "INTEGRATOR" },
    { headers: { "Content-Type": "application/json" }, timeout: 10000 }
  );
  return res.data?.token || res.data?.jwt;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.username || !cfg.password) {
      return res.status(400).json({ success: false, message: "Hepsiburada ayarları eksik (merchantId, username, password)" });
    }

    const { product } = req.body;
    if (!product) return res.status(400).json({ success: false, message: "product verisi zorunlu" });

    const hbToken = await getHBToken(cfg.username, cfg.password);

    const item = {
      categoryId: product.categoryId,
      merchant: cfg.merchantId,
      attributes: {
        Barcode: product.barcode,
        merchantSku: product.stockCode || product.barcode,
        UrunAdi: product.title,
        UrunAciklamasi: product.description || product.title,
        Marka: product.brandName,
        tax_vat_rate: String(product.vatRate ?? 18),
        Image1: product.images?.[0] || "",
        ...(product.images?.[1] ? { Image2: product.images[1] } : {}),
        ...(product.images?.[2] ? { Image3: product.images[2] } : {}),
        ...(product.hbAttributes || {}),
      },
    };

    const response = await axios.post(
      `https://mpop.hepsiburada.com/products/api/products/${cfg.merchantId}`,
      [item],
      {
        headers: {
          Authorization: `Bearer ${hbToken}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    return res.json({ success: true, data: response.data, message: "Hepsiburada gönderim alındı" });
  } catch (err) {
    const hbErr = err?.response?.data;
    console.error("HB CREATE ERROR:", hbErr || err.message);
    return res.status(500).json({ success: false, message: hbErr?.message || err.message, detail: hbErr });
  }
}
