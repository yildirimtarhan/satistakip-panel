// 📁 /pages/api/products/update.js

import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  // ❗ Sadece PUT
  if (req.method !== "PUT") {
    return res
      .status(405)
      .json({ success: false, message: "Only PUT method allowed" });
  }

  try {
    await dbConnect();

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // -------------------------------
    // 🔐 TOKEN KONTROLÜ
    // -------------------------------
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    const companyId = decoded.companyId || null;

    // -------------------------------
    // 📦 ÖNCE ÜRÜNÜ BUL
    // -------------------------------
    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Çoklu firma / kullanıcı kontrolü
    if (
      existingProduct.userId &&
      String(existingProduct.userId) !== String(userId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bu ürünü güncelleme yetkiniz yok",
      });
    }

    if (
      companyId &&
      existingProduct.companyId &&
      String(existingProduct.companyId) !== String(companyId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bu firmaya ait olmayan ürünü güncelleyemezsiniz",
      });
    }

    // -------------------------------
    // 📝 GÜNCELLENECEK VERİ
    // -------------------------------
    const updateData = { ...req.body };

    // Güvenlik: bazı alanlar asla güncellenmesin
    delete updateData._id;
    delete updateData.userId;
    delete updateData.companyId;
    delete updateData.marketplaces; // Pazaryeri status alanlarını ezmeyelim

    // Görselleri normalize et
    if (updateData.images) {
      if (!Array.isArray(updateData.images)) {
        updateData.images = [updateData.images].filter(Boolean);
      } else {
        updateData.images = updateData.images
          .map((x) => (x || "").toString().trim())
          .filter(Boolean);
      }
    }

    // Sayısal alanları number’a çevir
    const numberFields = [
      "priceTl",
      "discountPriceTl",
      "vatRate",
      "usdPrice",
      "eurPrice",
      "profitMargin",
      "riskFactor",
      "calculatedPrice",
      "stock",
      "n11PreparingDay",
    ];

    numberFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updateData[field] = Number(updateData[field] || 0);
      }
    });

    // marketplaceSettings varsa sadece set et (status alanlarının olduğu "marketplaces" ile karışmasın)
    if (updateData.marketplaceSettings) {
      // burada özel bir işleme gerek yok, direkt kaydedebiliriz
    }

    // -------------------------------
    // 🔧 DB'DE ÜRÜNÜ GÜNCELLE
    // -------------------------------
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}
