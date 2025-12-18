// pages/api/urunler/update-stock.js

import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Sadece POST desteklenir",
    });
  }

  try {
    // 🔐 Token kontrol
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token yok",
      });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔌 Mongo bağlantısı (Mongoose)
    await dbConnect();

    const { productId, delta, reason } = req.body;

    if (!productId || typeof delta !== "number") {
      return res.status(400).json({
        success: false,
        message: "productId veya delta eksik",
      });
    }

    // 📦 Ürünü bul
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı",
      });
    }

    // 📈 Stok güncelle
    product.stock = Number(product.stock || 0) + Number(delta);
    await product.save();

    // 🧾 Stok logu
    await StockLog.create({
      productId: product._id,
      type: delta > 0 ? "in" : "out",
      quantity: Math.abs(delta),
      reason: reason || "manual",
      userId: decoded.userId,
      date: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Stok güncellendi",
      stock: product.stock,
    });
  } catch (err) {
    console.error("❌ update-stock hata:", err);
    return res.status(500).json({
      success: false,
      message: "Stok güncelleme hatası",
      error: err.message,
    });
  }
}
