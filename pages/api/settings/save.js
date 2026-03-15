import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri destekleniyor." });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token eksik" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const companyId = decoded.companyId || null;

    const {
      hbMerchantId,
      hbUsername,
      hbPassword,
      hbTestMode,
      hbStoreName,

      trendyolSupplierId,
      trendyolApiKey,
      trendyolApiSecret,
      trendyolStoreName,

      n11AppKey,
      n11AppSecret,
      n11Environment,
      n11StoreName,

      pazaramaSellerId,
      pazaramaApiKey,
      pazaramaApiSecret,
      pazaramaStoreName,

      pttavmApiKey,
      pttavmAccessToken,
      pttavmStoreName,

      idefixApiKey,
      idefixApiSecret,
      idefixVendorId,
      idefixTestMode,
    } = req.body || {};

    const { db } = await connectToDatabase();
    const col = db.collection("settings");
    const query = companyId ? { companyId } : { userId };

    const newDoc = {
      ...(companyId ? { companyId } : {}),
      ...(userId ? { userId } : {}),

      hepsiburada: {
        merchantId: hbMerchantId || "",
        username: hbUsername || "",
        password: hbPassword || "",
        testMode: hbTestMode || false,
        storeName: hbStoreName || "",
      },

      trendyol: {
        supplierId: trendyolSupplierId || "",
        apiKey: trendyolApiKey || "",
        apiSecret: trendyolApiSecret || "",
        storeName: trendyolStoreName || "",
      },

      n11: {
        appKey: n11AppKey || "",
        appSecret: n11AppSecret || "",
        environment: n11Environment || "production",
        storeName: n11StoreName || "",
      },

      pazarama: {
        sellerId: pazaramaSellerId || "",
        apiKey: pazaramaApiKey || "",
        apiSecret: pazaramaApiSecret || "",
        storeName: pazaramaStoreName || "",
      },

      pttavm: {
        apiKey: pttavmApiKey || "",
        accessToken: pttavmAccessToken || "",
        storeName: pttavmStoreName || "",
      },

      idefix: {
        apiKey: idefixApiKey || "",
        apiSecret: idefixApiSecret || "",
        vendorId: idefixVendorId || "",
        testMode: idefixTestMode !== false,
      },

      updatedAt: new Date(),
    };

    await col.updateOne(query, { $set: newDoc, $setOnInsert: { createdAt: new Date() } }, { upsert: true });

    return res.status(200).json({ message: "API bilgileri basariyla kaydedildi." });
  } catch (error) {
    console.error("API Settings Save Error:", error);
    return res.status(500).json({ message: "Sunucu hatasi", error: error.message });
  }
}
