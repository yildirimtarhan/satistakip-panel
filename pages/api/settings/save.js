import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: "Sadece POST istekleri destekleniyor." });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token eksik" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId;
    const companyId = decoded.companyId || null;

    const {
      hbMerchantId,
      hbSecretKey,
      hbUserAgent,

      trendyolSupplierId,
      trendyolApiKey,
      trendyolApiSecret,

      n11AppKey,
      n11AppSecret,
      n11Environment,
    } = req.body || {};

    const { db } = await connectToDatabase();
    const col = db.collection("settings");

    const query = companyId ? { companyId } : { userId };

    const newDoc = {
      ...(companyId ? { companyId } : {}),
      ...(userId ? { userId } : {}),

      hepsiburada: {
        merchantId: hbMerchantId || "",
        secretKey: hbSecretKey || "",
        userAgent: hbUserAgent || "",
      },

      trendyol: {
        supplierId: trendyolSupplierId || "",
        apiKey: trendyolApiKey || "",
        apiSecret: trendyolApiSecret || "",
      },

      n11: {
        appKey: n11AppKey || "",
        appSecret: n11AppSecret || "",
        environment: n11Environment || "production",
      },

      updatedAt: new Date(),
    };

    await col.updateOne(
      query,
      {
        $set: newDoc,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return res.status(200).json({
      message: "✅ API bilgileri başarıyla kaydedildi.",
    });
  } catch (error) {
    console.error("API Settings Save Error:", error);
    return res
      .status(500)
      .json({ message: "Sunucu hatası", error: error.message });
  }
}
