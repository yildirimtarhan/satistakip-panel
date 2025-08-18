import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteklerine izin verilir" });
  }

  try {
    // 1. Token kontrolü (giriş yapan kullanıcıyı bulmak için)
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token bulunamadı" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 2. MongoDB bağlantısı
    const client = await clientPromise;
    const db = client.db("satistakip");

    // 3. Kullanıcıya ait ayarları al
    const { 
      trendyolApiKey, 
      trendyolApiSecret, 
      trendyolSupplierId, 
      hepsiMerchantId, 
      hepsiSecretKey, 
      hepsiUserAgent 
    } = req.body;

    // 4. MongoDB’ye kaydet veya güncelle
    await db.collection("settings").updateOne(
      { userId },
      {
        $set: {
          trendyolApiKey,
          trendyolApiSecret,
          trendyolSupplierId,
          hepsiMerchantId,
          hepsiSecretKey,
          hepsiUserAgent,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return res.status(200).json({ message: "Ayarlar kaydedildi" });
  } catch (error) {
    console.error("Hata:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
