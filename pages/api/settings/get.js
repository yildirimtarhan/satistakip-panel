// 📁 /pages/api/settings/get.js
import clientPromise from "../../../lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  try {
    // 🔐 Token kontrolü
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const client = await clientPromise;
    const db = client.db("satistakip");

    // 🧩 Ayarları bul
    const settings = await db.collection("settings").findOne({ userId });

    if (!settings) {
      return res.status(200).json({ settings: null });
    }

    // 🔄 Eksik alanlar varsa boş string ile doldur
    const safeSettings = {
      hepsiburadaMerchantId: settings.hepsiburada?.merchantId || "",
      hepsiburadaSecretKey: settings.hepsiburada?.secretKey || "",
      hepsiburadaUserAgent: settings.hepsiburada?.userAgent || "",
      trendyolSupplierId: settings.trendyol?.supplierId || "",
      trendyolApiKey: settings.trendyol?.apiKey || "",
      trendyolApiSecret: settings.trendyol?.apiSecret || "",
      n11AppKey: settings.n11?.appKey || "",
      n11AppSecret: settings.n11?.appSecret || "",
      n11Environment: settings.n11?.environment || "production",
    };

    res.status(200).json({ settings: safeSettings });
  } catch (error) {
    console.error("API Ayarları getirme hatası:", error);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
