import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const companyId = decoded.companyId || null;

    const { db } = await connectToDatabase();

    const query = companyId ? { companyId } : { userId };

    const settingsDoc = await db.collection("settings").findOne(query);

    if (!settingsDoc) {
      return res.status(200).json({ settings: null });
    }

    const safeSettings = {
      hbMerchantId: settingsDoc.hepsiburada?.merchantId || "",
      hbSecretKey: settingsDoc.hepsiburada?.secretKey || "",
      hbUserAgent: settingsDoc.hepsiburada?.userAgent || "",

      trendyolSupplierId: settingsDoc.trendyol?.supplierId || "",
      trendyolApiKey: settingsDoc.trendyol?.apiKey || "",
      trendyolApiSecret: settingsDoc.trendyol?.apiSecret || "",

      n11AppKey: settingsDoc.n11?.appKey || "",
      n11AppSecret: settingsDoc.n11?.appSecret || "",
      n11Environment: settingsDoc.n11?.environment || "production",
    };

    return res.status(200).json({ settings: safeSettings });
  } catch (error) {
    console.error("API Ayarları getirme hatası:", error);
    return res
      .status(500)
      .json({ message: "Sunucu hatası", error: error.message });
  }
}
