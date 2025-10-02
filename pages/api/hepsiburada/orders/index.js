// pages/api/hepsiburada/orders/index.js
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // Token kontrolü
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // Kullanıcı bilgilerini DB’den çek
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    // API ayarları yoksa
    if (!user.apiSettings || !user.apiSettings.hepsiburada) {
      return res.status(400).json({ message: "Hepsiburada API ayarları eksik" });
    }

    const { username, password, secretKey, userAgent } = user.apiSettings.hepsiburada;

    // Hepsiburada API isteği
    const response = await fetch(
      "https://oms-external.hepsiburada.com/orders?status=Created",
      {
        method: "GET",
        headers: {
          Authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64"),
          "User-Agent": userAgent || "satistakip.online",
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    // 🔍 Debug loglar
    console.log("HB API Response Status:", response.status);
    console.log("HB API Raw Data:", data);

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Hepsiburada API hatası",
        error: data,
      });
    }

    return res.status(200).json({
      message: "Siparişler çekildi",
      orders: data || [],
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
