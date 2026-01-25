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

  const userId = decoded.userId || decoded._id || decoded.id;
  const companyId = decoded.companyId || null;

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("company_settings");

    // ✅ Multi-tenant query (companyId varsa onu baz al, yoksa userId)
    // Eski kayıtlar için fallback
    const query = companyId ? { companyId } : { userId };

    if (req.method === "GET") {
      const doc = await col.findOne(query);

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

      // ✅ $set içine multi-tenant alanlarını düzgün ekle
      const $set = {
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

        // tenant alanları
        userId: String(userId || ""),
      };

      if (companyId) {
        $set.companyId = String(companyId);
      }

      await col.updateOne(
        query,
        {
          $set,
          $setOnInsert: {
            createdAt: new Date(),
          },
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
