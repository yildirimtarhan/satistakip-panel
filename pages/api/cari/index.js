// 📄 /pages/api/cari/index.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  res.setHeader("Allow", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await dbConnect();

    // 🔐 Token kontrolü
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) return res.status(401).json({ message: "Token eksik" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // =======================
    // GET → Cari listesi
    // =======================
    if (req.method === "GET") {
      const list = await Cari.find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json(list || []);
    }

    // =======================
    // POST → Cari ekle
    // =======================
    if (req.method === "POST") {
      const b = req.body || {};

      if (!b.ad) {
        return res
          .status(400)
          .json({ message: "Lütfen 'ad' alanını doldurun." });
      }

      const doc = {
        ad: b.ad,
        tur: b.tur || "Müşteri",
        telefon: b.telefon || "",
        email: b.email || "",
        vergiTipi: b.vergiTipi || "TCKN",
        vergiNo: b.vergiNo || "",
        vergiDairesi: b.vergiDairesi || "",
        adres: b.adres || "",
        il: b.il || "",
        ilce: b.ilce || "",
        postaKodu: b.postaKodu || "",
        paraBirimi: b.paraBirimi || "TRY",

        // 🎯 PAZARYERİ MÜŞTERİ ID'LERİ (FRONTEND İLE BİREBİR)
        trendyolCustomerId: b.trendyolCustomerId || "",
        hbCustomerId: b.hbCustomerId || "",
        n11CustomerId: b.n11CustomerId || "",
        amazonCustomerId: b.amazonCustomerId || "",
        pttCustomerId: b.pttCustomerId || "",
        idefixCustomerId: b.idefixCustomerId || "",
        ciceksepetiCustomerId: b.ciceksepetiCustomerId || "",

        bakiye: 0,
        totalSales: 0,
        totalPurchases: 0,

        userId: decoded.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const r = await Cari.create(doc);
      return res.status(201).json({ message: "Cari eklendi", _id: r._id });
    }

    // =======================
    // PUT → Cari güncelle
    // =======================
    if (req.method === "PUT") {
      const { cariId } = req.query;

      if (!cariId)
        return res.status(400).json({ message: "cariId zorunludur." });

      let _id;
      try {
        _id = new Types.ObjectId(cariId);
      } catch {
        return res.status(400).json({ message: "Geçersiz ID." });
      }

      const b = req.body || {};

      const updateDoc = {
        ...(b.ad !== undefined && { ad: b.ad }),
        ...(b.tur !== undefined && { tur: b.tur }),
        ...(b.telefon !== undefined && { telefon: b.telefon }),
        ...(b.email !== undefined && { email: b.email }),
        ...(b.vergiTipi !== undefined && { vergiTipi: b.vergiTipi }),
        ...(b.vergiNo !== undefined && { vergiNo: b.vergiNo }),
        ...(b.vergiDairesi !== undefined && { vergiDairesi: b.vergiDairesi }),
        ...(b.adres !== undefined && { adres: b.adres }),
        ...(b.il !== undefined && { il: b.il }),
        ...(b.ilce !== undefined && { ilce: b.ilce }),
        ...(b.postaKodu !== undefined && { postaKodu: b.postaKodu }),
        ...(b.paraBirimi !== undefined && { paraBirimi: b.paraBirimi }),

        // 🎯 FRONTEND İLE AYNI ALANLAR
        ...(b.trendyolCustomerId !== undefined && {
          trendyolCustomerId: b.trendyolCustomerId,
        }),
        ...(b.hbCustomerId !== undefined && { hbCustomerId: b.hbCustomerId }),
        ...(b.n11CustomerId !== undefined && { n11CustomerId: b.n11CustomerId }),
        ...(b.amazonCustomerId !== undefined && {
          amazonCustomerId: b.amazonCustomerId,
        }),
        ...(b.pttCustomerId !== undefined && { pttCustomerId: b.pttCustomerId }),
        ...(b.idefixCustomerId !== undefined && {
          idefixCustomerId: b.idefixCustomerId,
        }),
        ...(b.ciceksepetiCustomerId !== undefined && {
          ciceksepetiCustomerId: b.ciceksepetiCustomerId,
        }),

        updatedAt: new Date(),
      };

      await Cari.updateOne({ _id, userId: decoded.userId }, updateDoc);

      return res.status(200).json({ message: "Cari güncellendi" });
    }

    // =======================
    // DELETE → Cari sil
    // =======================
    if (req.method === "DELETE") {
      const { cariId } = req.query;

      if (!cariId)
        return res.status(400).json({ message: "cariId zorunludur." });

      await Cari.deleteOne({
        _id: new Types.ObjectId(cariId),
        userId: decoded.userId,
      });

      return res.status(200).json({ message: "Cari silindi" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("Cari API hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
