import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";
import { n11CreateProduct } from "@/lib/marketplaces/n11Service";

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Method Not Allowed",
      });
    }

    // ✅ TOKEN KONTROL
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token eksik",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Token geçersiz",
      });
    }

    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    // ✅ BODY KONTROL — productId (ERP ürünü) veya product (link ile yükleme payload'ı)
    const { productId, product: productPayload, n11Override } = req.body || {};
    let product;

    if (productPayload && typeof productPayload === "object" && (productPayload.name || productPayload.title)) {
      // Link ile yükleme: doğrudan gönderilen ürün verisi
      product = {
        name: productPayload.name || productPayload.title,
        title: productPayload.title || productPayload.name,
        description: productPayload.description || "",
        barcode: productPayload.barcode || productPayload.barkod,
        sku: productPayload.sku || productPayload.stockCode || productPayload.barcode,
        price: productPayload.price ?? productPayload.salePrice ?? 0,
        listPrice: productPayload.listPrice ?? productPayload.price,
        stock: productPayload.stock ?? productPayload.quantity ?? 0,
        images: productPayload.images || [],
      };
    } else if (productId) {
      const found = await Product.findOne({
        _id: productId,
        ...(companyId ? { $or: [{ companyId }, { userId }] } : { userId }),
      });
      if (!found) {
        return res.status(404).json({ success: false, message: "Ürün bulunamadı" });
      }
      product = found;
    } else {
      return res.status(400).json({ success: false, message: "productId veya product (link ile yükleme) zorunludur" });
    }

    // ✅ N11 CREATE ÇAĞRISI — n11Override ile form verilerini doğrudan geçir
    const result = await n11CreateProduct(req, product, n11Override || {});

    if (productId && product._id) {
      // ERP ürünü ise taskId'yi DB'ye yaz (task-status için)
      if (result?.success && result?.taskId) {
        await Product.findByIdAndUpdate(productId, {
          n11TaskId: result.taskId,
          n11TaskStatus: "IN_QUEUE",
          n11TaskReason: "",
          n11LastCheckAt: new Date(),
        });
      }
      product.integrationStatus = product.integrationStatus || {};
      product.integrationStatus.n11 = result?.success
        ? { status: "success", taskId: result.taskId || null, sentAt: new Date(), message: result.message || "N11'e gönderildi" }
        : { status: "error", taskId: result?.taskId || null, sentAt: new Date(), message: result?.message || "N11 gönderim hatası" };
      await product.save();
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("N11 CREATE API ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Sunucu hatası",
    });
  }
}
