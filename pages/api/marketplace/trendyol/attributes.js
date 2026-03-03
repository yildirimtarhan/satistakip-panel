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

    const { getTrendyolCredentials } = await import("@/lib/getTrendyolCredentials");
    const { categoryAttributesUrl } = await import("@/lib/marketplaces/trendyolConfig");
    const creds = await getTrendyolCredentials(req);
    if (!creds) {
      return res.status(400).json({
        success: false,
        message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol."
      });
    }

    const URL = categoryAttributesUrl(categoryId);
    const response = await axios.get(URL, {
      headers: {
        Authorization: "Basic " + Buffer.from(creds.apiKey + ":" + creds.apiSecret).toString("base64"),
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
