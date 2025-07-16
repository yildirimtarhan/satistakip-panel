// pages/api/trendyol.js

import axios from "axios";

export default async function handler(req, res) {
  const API_KEY = "at014r6YHvXtdLJ4j2nl";
  const API_SECRET = "hEPtUkQQ64ihtPCIRk6o";
  const SUPPLIER_ID = 384776; // Satıcı ID

  try {
    const response = await axios.get(
      `https://api.trendyol.com/sapigw/suppliers/${SUPPLIER_ID}/orders`,
      {
        headers: {
          "User-Agent": "OpenAPI-Client/1.0.0",
          "Authorization": `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64")}`,
        },
      }
    );

    res.status(200).json({ success: true, orders: response.data });
  } catch (error) {
    console.error("Trendyol API hatası:", error?.response?.data || error.message);
    res.status(500).json({ error: "Trendyol API bağlantı hatası" });
  }
}
