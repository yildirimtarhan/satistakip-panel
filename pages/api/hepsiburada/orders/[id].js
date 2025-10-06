// pages/api/hepsiburada/orders/[id].js
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Yalnızca GET istekleri desteklenir" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Token eksik" });
  }

  const token = authHeader.split(" ")[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const { id } = req.query;

  try {
    const response = await fetch(`https://mpop.hepsiburada.com/api/orders/${id}`, {
      headers: {
        "Authorization": `Basic ${Buffer.from(
          `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
        ).toString("base64")}`,
        "User-Agent": process.env.HB_USER_AGENT
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Hepsiburada API hatası",
        detail: data
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Hepsiburada detay hatası:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
}
