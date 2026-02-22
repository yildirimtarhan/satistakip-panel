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

    /* ================= AUTH ================= */
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    /* ================= BODY ================= */
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId zorunlu",
      });
    }

    const product = await Product.findOne({ _id: productId, companyId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı",
      });
    }

    const sellerSku = product.marketplaceSettings?.n11?.sellerSku;
    if (!sellerSku) {
      return res.status(400).json({
        success: false,
        message: "N11 sellerSku bulunamadı",
      });
    }

    /* ================= N11 SETTINGS ================= */
    const cfg = await getN11SettingsFromRequest(req);

    /* ================= N11 REST UPDATE ================= */
    const response = await axios.post(
      "https://api.n11.com/ms/price-stock-update",
      {
        items: [
          {
            sellerCode: sellerSku,
            price: Number(product.priceTl),
            stock: Number(product.stock || 0),
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          appkey: cfg.appKey,
          appsecret: cfg.appSecret,
        },
      }
    );

    const taskId = response.data?.taskId;

    /* ================= DB UPDATE ================= */
    product.marketplaceSettings.n11.lastTaskId = taskId;
    product.marketplaceSettings.n11.lastTaskStatus = "IN_QUEUE";
    product.marketplaceSettings.n11.lastSyncAt = new Date();

    await product.save();

    return res.json({
      success: true,
      taskId,
      message: "N11 fiyat & stok güncelleme kuyruğa alındı",
    });
  } catch (err) {
    console.error("N11 UPDATE ERROR:", err?.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
