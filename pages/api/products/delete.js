// 📁 /pages/api/products/delete.js
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({
      success: false,
      message: "Only DELETE method is allowed",
    });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // 📌 Token doğrulama
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authorization header",
      });
    }

    const token = authHeader.replace("Bearer ", "");
    let decoded = null;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // 📌 Mongo bağlan
    await dbConnect();

    // 📌 Ürünü sil
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}
