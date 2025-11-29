// 📁 /pages/api/marketplace/trendyol/attributes.js
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Only GET allowed" });
  }

  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId parametresi gerekli"
      });
    }

    const SUPPLIER_ID = process.env.TRENDYOL_SUPPLIER_ID;
    const API_KEY = process.env.TRENDYOL_API_KEY;
    const API_SECRET = process.env.TRENDYOL_API_SECRET;

    if (!SUPPLIER_ID || !API_KEY || !API_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Trendyol API bilgileri eksik!"
      });
    }

    const URL = `https://api.trendyol.com/sapigw/product-categories/${categoryId}/attributes`;

    const response = await axios.get(URL, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(API_KEY + ":" + API_SECRET).toString("base64"),
      },
    });

    const attributes = response.data?.attributes || [];

    // 🔍 Renk ve beden attribute'larını buluyoruz
    let colors = [];
    let sizes = [];

    for (const attr of attributes) {
      const name = attr.name.toLowerCase();

      // Renk
      if (name.includes("renk") || name.includes("color")) {
        colors = attr.values.map((v) => v.name);
      }

      // Beden
      if (name.includes("beden") || name.includes("size")) {
        sizes = attr.values.map((v) => v.name);
      }
    }

    return res.status(200).json({
      success: true,
      colors,
      sizes,
      rawAttributes: attributes // İstersek UI’da farklı özellikler için de kullanırız
    });

  } catch (err) {
    console.error("Trendyol Attribute Error:", err.response?.data || err.message);

    return res.status(500).json({
      success: false,
      message: err.response?.data?.errorMessage || err.message
    });
  }
}
