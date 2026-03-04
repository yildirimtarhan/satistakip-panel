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
    const userIdStr = String(userId || "");
    const companyIdStr = companyId ? String(companyId) : null;

    // GET: Önce companyId ile ara, yoksa userId ile (eski kayıtlar sadece userId ile olabilir)
    const getQuery = companyIdStr
      ? { $or: [ { companyId: companyIdStr }, { userId: userIdStr } ] }
      : { userId: userIdStr };

    if (req.method === "GET") {
      const doc = await col.findOne(getQuery);

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
          imza: "",
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
        imza = "",
      } = req.body || {};

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
        imza,
        updatedAt: new Date(),
        userId: userIdStr,
      };
      if (companyIdStr) $set.companyId = companyIdStr;

      // Koleksiyonda unique index userId üzerinde: aynı userId ile ikinci doc eklenemez.
      // Önce bu kullanıcıya ait doc'u userId ile bul (multi-tenant bozulmaz), varsa güncelle, yoksa tek doc ekle.
      const existing = await col.findOne({ userId: userIdStr });
      if (existing) {
        await col.updateOne(
          { _id: existing._id },
          { $set }
        );
      } else {
        await col.insertOne({
          ...$set,
          createdAt: new Date(),
        });
      }

      return res.status(200).json({ message: "Firma ayarları kaydedildi" });
    }

    return res.status(405).json({ message: "Yalnızca GET ve POST desteklenir" });
  } catch (err) {
    console.error("Firma Ayarları API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
