// 📁 pages/api/settings/company.js
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: "Token eksik" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Geçersiz token" });
  }

  const userId = decoded.userId || decoded._id;

  try {
    // 🔥 Mongoose uyumlu bağlantı
    const { db } = await connectToDatabase();
    const col = db.collection("company_settings");

    if (req.method === "GET") {
      const doc = await col.findOne({ userId });

      return res.status(200).json(
        doc || {
          firmaAdi: "",
          yetkili: "",
          telefon: "",
          eposta: "",
          web: "",
          vergiDairesi: "",
          vergiNo: "",
          adres: "",
          logo: "",
        }
      );
    }

    if (req.method === "POST") {
      const {
        firmaAdi = "",
        yetkili = "",
        telefon = "",
        eposta = "",
        web = "",
        vergiDairesi = "",
        vergiNo = "",
        adres = "",
        logo = "",
      } = req.body || {};

      await col.updateOne(
        { userId },
        {
          $set: {
            firmaAdi,
            yetkili,
            telefon,
            eposta,
            web,
            vergiDairesi,
            vergiNo,
            adres,
            logo,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      return res.status(200).json({ message: "Firma ayarları kaydedildi" });
    }

    return res.status(405).json({ message: "Yalnızca GET ve POST desteklenir" });
  } catch (err) {
    console.error("Firma Ayarları API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
