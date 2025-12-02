// 📁 /pages/api/products/update.js

import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
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

    // -------------------------------
    // 📝 GÜNCELLENECEK VERİYİ AL
    // -------------------------------
    const updateData = req.body;

    // Marketplace durumlarını ezmemek için siliyoruz
    delete updateData.marketplaces;

    // -------------------------------
    // 🔧 DB'DE ÜRÜNÜ GÜNCELLE
    // -------------------------------
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

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
