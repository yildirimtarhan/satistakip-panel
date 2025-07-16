// pages/api/trendyol/orders/[id].js

import axios from "axios";

export default async function handler(req, res) {
  const { id } = req.query;

  const baseUrl = process.env.TRENDYOL_API_BASE;
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;

  const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const trendyolRes = await axios.get(`${baseUrl}/orders/${id}`, {
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
      },
    });

    return res.status(200).json(trendyolRes.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const detail = error.response?.data || error.message;

    console.error("🔥 Trendyol API Hatası:", detail);
    return res.status(status).json({ error: "Trendyol API hatası", detail });
  }
}
