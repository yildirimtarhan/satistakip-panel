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

    // ✅ BODY KONTROL
    const { productId, n11Override } = req.body || {};
    if (!productId) {
      return res.status(400).json({ success: false, message: "productId zorunludur" });
    }

    // ✅ ÜRÜN BUL (companyId veya userId ile — migration fallback)
    const product = await Product.findOne({
      _id: productId,
      ...(companyId ? { $or: [{ companyId }, { userId }] } : { userId }),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı",
      });
    }

    // ✅ N11 CREATE ÇAĞRISI — n11Override ile form verilerini doğrudan geçir
    const result = await n11CreateProduct(req, product, n11Override);

    /**
     * ======================================================
     * 🔥 TASK STATUS ZİNCİRİ – EN KRİTİK YAMA
     * ======================================================
     * taskId GELİR GELMEZ DB'YE YAZIYORUZ
     * aksi halde task-status endpoint'i çalışmaz
     */
    if (result?.success && result?.taskId) {
      await Product.findByIdAndUpdate(productId, {
        n11TaskId: result.taskId,
        n11TaskStatus: "IN_QUEUE",
        n11TaskReason: "",
        n11LastCheckAt: new Date(),
      });
    }

    // ✅ integrationStatus (mevcut yapıyı BOZMADAN)
    product.integrationStatus = product.integrationStatus || {};

    if (result?.success) {
      product.integrationStatus.n11 = {
        status: "success",
        taskId: result.taskId || null,
        sentAt: new Date(),
        message: result.message || "N11'e gönderildi",
      };
    } else {
      product.integrationStatus.n11 = {
        status: "error",
        taskId: result?.taskId || null,
        sentAt: new Date(),
        message: result?.message || "N11 gönderim hatası",
      };
    }

    await product.save();

    return res.status(200).json(result);
  } catch (error) {
    console.error("N11 CREATE API ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Sunucu hatası",
    });
  }
}
