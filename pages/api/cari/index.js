// 📄 /pages/api/cari/index.js
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  res.setHeader("Allow", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // 🔐 Token kontrolü
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Token eksik" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const client = await clientPromise;
    const db = client.db("satistakip");
    const collection = db.collection("accounts"); // cari kayıtları

    // =======================
    // GET  -> Cari listesi
    // =======================
    if (req.method === "GET") {
      const list = await collection
        .find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .toArray();

      // Varsayılan alanlar (balance vs.) yoksa 0 ata
      const withDefaults = (list || []).map((c) => ({
        ...c,
        balance: Number(c.balance || 0),
        totalSales: Number(c.totalSales || 0),
        totalPurchases: Number(c.totalPurchases || 0),
      }));

      return res.status(200).json(withDefaults);
    }

    // =======================
    // POST -> Yeni cari ekle
    // =======================
    if (req.method === "POST") {
      const body = req.body || {};
      if (!body.ad) {
        return res.status(400).json({ message: "Lütfen 'ad' alanını doldurun." });
      }

      const doc = {
        ad: body.ad,
        tur: body.tur || "Müşteri",
        telefon: body.telefon || "",
        email: body.email || "",
        vergiTipi: body.vergiTipi || "TCKN",
        vergiNo: body.vergiNo || "",
        paraBirimi: body.paraBirimi || "TRY",
        kdvOrani: Number(body.kdvOrani ?? 20),
        adres: body.adres || "",
        il: body.il || "",
        ilce: body.ilce || "",
        postaKodu: body.postaKodu || "",
        profileUrl: body.profileUrl || "",
        // Bakiye alanları (transactions API güncel tutar ama başlangıç değerleri 0 olsun)
        balance: 0,
        totalSales: 0,
        totalPurchases: 0,

        userId: decoded.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(doc);
      return res.status(201).json({ message: "✅ Cari başarıyla eklendi", _id: result.insertedId });
    }

    // =======================
    // PUT  -> Cari güncelle
    // /api/cari?cariId=<id>
    // =======================
    if (req.method === "PUT") {
      const { cariId } = req.query;
      if (!cariId) return res.status(400).json({ message: "cariId zorunludur." });

      let _id;
      try {
        _id = new ObjectId(cariId);
      } catch {
        return res.status(400).json({ message: "Geçersiz cariId." });
      }

      const body = req.body || {};
      // userId gibi hassas alanların değişmesini engelle
      delete body.userId;
      delete body.createdAt;
      // Bakiye alanları UI’dan yanlışlıkla sıfırlanmasın diye opsiyonel: istersen yorumu kaldır.
      // delete body.balance; delete body.totalSales; delete body.totalPurchases;

      const updateDoc = {
        ...(body.ad !== undefined && { ad: body.ad }),
        ...(body.tur !== undefined && { tur: body.tur }),
        ...(body.telefon !== undefined && { telefon: body.telefon }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.vergiTipi !== undefined && { vergiTipi: body.vergiTipi }),
        ...(body.vergiNo !== undefined && { vergiNo: body.vergiNo }),
        ...(body.paraBirimi !== undefined && { paraBirimi: body.paraBirimi }),
        ...(body.kdvOrani !== undefined && { kdvOrani: Number(body.kdvOrani) }),
        ...(body.adres !== undefined && { adres: body.adres }),
        ...(body.il !== undefined && { il: body.il }),
        ...(body.ilce !== undefined && { ilce: body.ilce }),
        ...(body.postaKodu !== undefined && { postaKodu: body.postaKodu }),
        ...(body.profileUrl !== undefined && { profileUrl: body.profileUrl }),
        ...(body.balance !== undefined && { balance: Number(body.balance) }),
        ...(body.totalSales !== undefined && { totalSales: Number(body.totalSales) }),
        ...(body.totalPurchases !== undefined && { totalPurchases: Number(body.totalPurchases) }),
        updatedAt: new Date(),
      };

      const result = await collection.updateOne(
        { _id, userId: decoded.userId },
        { $set: updateDoc }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Cari bulunamadı." });
      }

      return res.status(200).json({ message: "✅ Cari güncellendi" });
    }

    // =======================
    // DELETE -> Cari sil
    // /api/cari?cariId=<id>
    // =======================
    if (req.method === "DELETE") {
      const { cariId } = req.query;
      if (!cariId) return res.status(400).json({ message: "cariId zorunludur." });

      let _id;
      try {
        _id = new ObjectId(cariId);
      } catch {
        return res.status(400).json({ message: "Geçersiz cariId." });
      }

      const result = await collection.deleteOne({ _id, userId: decoded.userId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Cari bulunamadı." });
      }

      return res.status(200).json({ message: "✅ Cari silindi" });
    }

    // Desteklenmeyen method
    return res.status(405).json({ message: "Yalnızca GET, POST, PUT, DELETE desteklenir" });
  } catch (err) {
    console.error("🔥 Cari API hatası:", err);
    // JWT özel hata mesajı
    if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Geçersiz veya süresi dolmuş token" });
    }
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
