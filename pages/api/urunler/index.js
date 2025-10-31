// 📁 /pages/api/urunler/index.js
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ✅ Auth
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token eksik" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = await clientPromise;
    const db = client.db("satistakip");
    const products = db.collection("products");

    // ✅ GET - Ürün Listele
    if (req.method === "GET") {
      const list = await products
        .find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(list);
    }

    // ✅ POST - Ürün Ekle
    if (req.method === "POST") {
      const b = req.body || {};

      if (!b.ad || !b.satisFiyati)
        return res.status(400).json({ message: "Ürün adı ve satış fiyatı zorunlu" });

      const doc = {
        ad: b.ad.trim(),
        barkod: b.barkod || "",
        sku: b.sku || "",
        marka: b.marka || "",
        kategori: b.kategori || "",
        aciklama: b.aciklama || "",
        birim: b.birim || "Adet",

        resimUrl: b.resimUrl || "",
        varyantlar: b.varyantlar || [],

        alisFiyati: Number(b.alisFiyati || 0),
        satisFiyati: Number(b.satisFiyati),
        stok: Number(b.stok || 0),
        stokUyari: Number(b.stokUyari || 0),

        paraBirimi: b.paraBirimi || "TRY",
        kdvOrani: Number(b.kdvOrani ?? 20),

        userId: decoded.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await products.insertOne(doc);
      return res.status(201).json({ message: "✅ Ürün eklendi", _id: result.insertedId });
    }

    // ✅ PUT - Ürün Güncelle
    if (req.method === "PUT") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: "Ürün ID eksik" });

      const b = req.body;

      const update = {
        ad: b.ad,
        barkod: b.barkod || "",
        sku: b.sku || "",
        marka: b.marka || "",
        kategori: b.kategori || "",
        aciklama: b.aciklama || "",
        birim: b.birim || "Adet",
        resimUrl: b.resimUrl || "",
        varyantlar: b.varyantlar || [],

        alisFiyati: Number(b.alisFiyati || 0),
        satisFiyati: Number(b.satisFiyati),
        stok: Number(b.stok),
        stokUyari: Number(b.stokUyari || 0),
        paraBirimi: b.paraBirimi,
        kdvOrani: Number(b.kdvOrani),

        updatedAt: new Date(),
      };

      await products.updateOne(
        { _id: new ObjectId(id), userId: decoded.userId },
        { $set: update }
      );

      return res.status(200).json({ message: "✅ Ürün güncellendi" });
    }

    // ✅ DELETE - Ürün Sil
    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: "ID eksik" });

      await products.deleteOne({ _id: new ObjectId(id), userId: decoded.userId });

      return res.status(200).json({ message: "🗑️ Ürün silindi" });
    }

    return res.status(405).json({ message: "Method not allowed" });

  } catch (err) {
    console.error("🔥 Ürün API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
