// pages/api/settings/save.js
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri destekleniyor." });
  }

  try {
    await dbConnect();

    // Token kontrolü (giriş yapan kullanıcıyı bulmak için)
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token eksik" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const {
      hepsiburadaMerchantId,
      hepsiburadaSecretKey,
      hepsiburadaUserAgent,
      trendyolSupplierId,
      trendyolApiKey,
      trendyolApiSecret,
    } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        hepsiburada: {
          merchantId: hepsiburadaMerchantId,
          secretKey: hepsiburadaSecretKey,
          userAgent: hepsiburadaUserAgent,
        },
        trendyol: {
          supplierId: trendyolSupplierId,
          apiKey: trendyolApiKey,
          apiSecret: trendyolApiSecret,
        },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({ message: "API bilgileri kaydedildi", user: updatedUser });
  } catch (error) {
    console.error("API Settings Save Error:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
