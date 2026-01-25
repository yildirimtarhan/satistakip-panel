// /pages/api/n11/products/create.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Product from "@/models/Product";
import { n11CreateProduct } from "@/lib/n11Service";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Token eksik" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "companyId bulunamadı" });
    }

    const { productId } = req.body || {};
    if (!productId) {
      return res.status(400).json({ success: false, message: "productId zorunlu" });
    }

    await dbConnect();

    // ✅ Multi-tenant güvenli
    const p = await Product.findOne({ _id: productId, companyId });
    if (!p) {
      return res.status(404).json({ success: false, message: "Ürün bulunamadı" });
    }

    const n11 = p.marketplaceSettings?.n11 || {};
    if (!n11.categoryId) {
      return res.status(400).json({ success: false, message: "N11 categoryId boş (ürüne kategori seç)" });
    }
    if (!n11.preparingDay && n11.preparingDay !== 0) {
      return res.status(400).json({ success: false, message: "N11 preparingDay boş" });
    }
    if (!n11.shipmentTemplate) {
      return res.status(400).json({ success: false, message: "N11 shipmentTemplate boş" });
    }

    // ✅ attributes array format kontrolü
    const attributes = Array.isArray(n11.attributes) ? n11.attributes : [];
    // Zorunlu değil ama canlıda lazım olabiliyor:
    // if (attributes.length === 0) return res.status(400).json({ success:false, message:"N11 attributes boş" });

    // n11Service beklediği normalize product (senin alanlarına göre)
    const payloadProduct = {
      _id: p._id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || "",
      description: p.description || "",
      priceTl: Number(p.priceTl || 0),
      discountPriceTl: p.discountPriceTl ? Number(p.discountPriceTl) : null,
      vatRate: Number(p.vatRate || 20),
      stock: Number(p.stock || 0),
      images: Array.isArray(p.images) ? p.images : [],
      modelCode: p.modelCode || p.sku,
      brand: p.brand || "",
      marketplaceSettings: {
        ...(p.marketplaceSettings || {}),
        n11: {
          ...(n11 || {}),
          attributes, // ✅
        },
      },
    };

    const result = await n11CreateProduct(req, payloadProduct);

    if (!result.success) {
      return res.status(400).json({ success: false, ...result });
    }

    // ✅ product içine taskId/status yaz (istersen)
    p.marketplaces = p.marketplaces || {};
    p.marketplaces.n11 = {
      status: "Sent",
      taskId: result.taskId,
      sentAt: new Date(),
    };
    await p.save();

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("N11 CREATE ERROR:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}
