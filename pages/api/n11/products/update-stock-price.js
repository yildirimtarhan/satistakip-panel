import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";
import axios from "axios";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  try {
    await dbConnect();

    /* ── AUTH ── */
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    /* ── BODY ── */
    const { productId, productIds } = req.body;

    // Tekil veya çoklu ürün desteği
    const ids = productIds?.length
      ? productIds
      : productId
      ? [productId]
      : [];

    if (!ids.length) {
      return res.status(400).json({ success: false, message: "productId zorunlu" });
    }

    /* ── ÜRÜNLER ── */
    const filter = {
      _id: { $in: ids },
      ...(companyId ? { $or: [{ companyId }, { userId }] } : { userId }),
    };
    const products = await Product.find(filter).lean();

    if (!products.length) {
      return res.status(404).json({ success: false, message: "Güncellenecek ürün bulunamadı" });
    }

    /* ── N11 AYARLARI ── */
    const cfg = await getN11SettingsFromRequest(req);
    if (!cfg?.appKey || !cfg?.appSecret) {
      return res.status(400).json({ success: false, message: "N11 API ayarları eksik" });
    }

    /* ── SKU LİSTESİ HAZIRLA ── */
    const skus = [];
    const skipped = [];

    for (const product of products) {
      const stockCode =
        product.marketplaceSettings?.n11?.sellerSku ||
        product.sku ||
        product.barcode ||
        null;

      if (!stockCode) {
        skipped.push(product._id);
        continue;
      }

      const salePrice = Number(product.priceTl || product.price || product.salePrice || 0);
      const listPrice = Number(product.listPrice || product.priceTlList || salePrice * 1.1);
      const quantity = Number(product.stock ?? product.quantity ?? 0);

      skus.push({
        stockCode,
        listPrice: Math.max(listPrice, salePrice + 0.01),
        salePrice,
        quantity,
        currencyType: "TL",
      });
    }

    if (!skus.length) {
      return res.status(400).json({
        success: false,
        message: "Güncellenecek ürünlerde N11 stok kodu (SKU) bulunamadı",
        skipped,
      });
    }

    /* ── N11 REST ÇAĞRISI (Doğru endpoint ve format) ── */
    // Doküman: POST https://api.n11.com/ms/product/tasks/price-stock-update
    // Body: { payload: { integrator, skus: [{ stockCode, listPrice, salePrice, quantity, currencyType }] } }
    const response = await axios.post(
      "https://api.n11.com/ms/product/tasks/price-stock-update",
      {
        payload: {
          integrator: cfg.integrator || "SatisTakip",
          skus,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          appkey: cfg.appKey,
          appsecret: cfg.appSecret,
        },
        timeout: 15000,
      }
    );

    const taskId = response.data?.id || response.data?.taskId;
    const status = response.data?.status || "IN_QUEUE";

    /* ── DB GÜNCELLE ── */
    await Product.updateMany(
      { _id: { $in: products.map((p) => p._id) } },
      {
        $set: {
          "marketplaceSettings.n11.lastTaskId": taskId,
          "marketplaceSettings.n11.lastTaskStatus": status,
          "marketplaceSettings.n11.lastSyncAt": new Date(),
        },
      }
    );

    return res.json({
      success: true,
      taskId,
      status,
      updatedCount: skus.length,
      skippedCount: skipped.length,
      message: `${skus.length} ürün N11 güncelleme kuyruğuna alındı`,
    });
  } catch (err) {
    const n11Error = err?.response?.data;
    console.error("N11 UPDATE ERROR:", n11Error || err.message);
    return res.status(500).json({
      success: false,
      message: n11Error?.message || n11Error?.error || err.message,
      detail: n11Error,
    });
  }
}
