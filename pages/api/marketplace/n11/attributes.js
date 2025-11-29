// 📁 /pages/api/marketplace/n11/attributes.js
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET method allowed",
    });
  }

  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId parametresi gerekli",
      });
    }

    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_APP_SECRET;

    if (!APP_KEY || !APP_SECRET) {
      return res.status(500).json({
        success: false,
        message: "N11 API bilgileri eksik!",
      });
    }

    const URL = `https://api.n11.com/rest/category/${categoryId}/attributes`;

    const response = await axios.get(URL, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(APP_KEY + ":" + APP_SECRET).toString("base64"),
      },
    });

    const attributes = response.data?.attributes || [];

    let colors = [];
    let sizes = [];

    // 🔍 Renk ve Beden attribute ID'leri otomatik ayrıştırılır
    for (const attr of attributes) {
      const name = attr?.name?.toLowerCase() || "";

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
      rawAttributes: attributes, // İleride gerekli olursa
    });

  } catch (err) {
    console.error("N11 Attribute Error:", err.response?.data || err.message);

    return res.status(500).json({
      success: false,
      message: err.response?.data?.error?.message || err.message,
    });
  }
}
