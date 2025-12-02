// 📁 /pages/api/products/get.js

import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Only GET method allowed" });
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
    // 🔐 Token kontrolü
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
    // 📌 Ürünü DB'den çek
    // -------------------------------
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // -------------------------------
    // ✔ Başarılı sonuç
    // -------------------------------
    return res.status(200).json({
      success: true,
      product,
    });
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
}
