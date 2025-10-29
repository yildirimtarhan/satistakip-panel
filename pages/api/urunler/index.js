// 📄 /pages/api/urunler/index.js
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  res.setHeader("Allow", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // 🔐 Auth
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Token eksik" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const client = await clientPromise;
    const db = client.db("satistakip");
    const products = db.collection("products");

    if (req.method === "GET") {
      const list = await products
        .find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .toArray();

      const withDefaults = (list || []).map((p) => ({
        ...p,
        stock: Number(p.stock || 0),
        reserved: Number(p.reserved || 0),
      }));
      return res.status(200).json(withDefaults);
    }

    if (req.method === "POST") {
      const b = req.body || {};
      if (!b.ad) return res.status(400).json({ message: "Ürün adı zorunlu." });

      const doc = {
        ad: b.ad,
        fiyat: Number(b.fiyat ?? 0),
        paraBirimi: b.paraBirimi || "TRY",
        kdvOrani: Number(b.kdvOrani ?? 20),
        stock: Number(b.stok ?? b.stock ?? 0),
        reserved: Number(b.reserved ?? 0), // marketplace rezervasyonları için
        sku: b.sku || null,
        barcode: b.barcode || null,
        channels: b.channels || {}, // { hepsiburada: {listingId,...}, trendyol: {...}, n11:{...} }
        userId: decoded.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const r = await products.insertOne(doc);
      return res.status(201).json({ message: "✅ Ürün eklendi", _id: r.insertedId });
    }

    if (req.method === "PUT") {
      const { urunId } = req.query;
      if (!urunId) return res.status(400).json({ message: "urunId zorunlu." });

      let _id;
      try {
        _id = new ObjectId(urunId);
      } catch {
        return res.status(400).json({ message: "Geçersiz urunId." });
      }

      const b = req.body || {};
      delete b.userId;
      delete b.createdAt;

      const update = {
        ...(b.ad !== undefined && { ad: b.ad }),
        ...(b.fiyat !== undefined && { fiyat: Number(b.fiyat) }),
        ...(b.kdvOrani !== undefined && { kdvOrani: Number(b.kdvOrani) }),
        ...(b.paraBirimi !== undefined && { paraBirimi: b.paraBirimi }),
        ...(b.sku !== undefined && { sku: b.sku }),
        ...(b.barcode !== undefined && { barcode: b.barcode }),
        ...(b.channels !== undefined && { channels: b.channels }),
        // stok alanlarını direkt set etmek istersen (genelde update-stock endpoint’i önerilir)
        ...(b.stock !== undefined && { stock: Number(b.stock) }),
        ...(b.stok !== undefined && { stock: Number(b.stok) }),
        ...(b.reserved !== undefined && { reserved: Number(b.reserved) }),
        updatedAt: new Date(),
      };

      const r = await products.updateOne(
        { _id, userId: decoded.userId },
        { $set: update }
      );
      if (r.matchedCount === 0) return res.status(404).json({ message: "Ürün bulunamadı." });
      return res.status(200).json({ message: "✅ Ürün güncellendi" });
    }

    if (req.method === "DELETE") {
      const { urunId } = req.query;
      if (!urunId) return res.status(400).json({ message: "urunId zorunlu." });

      let _id;
      try {
        _id = new ObjectId(urunId);
      } catch {
        return res.status(400).json({ message: "Geçersiz urunId." });
      }

      const r = await products.deleteOne({ _id, userId: decoded.userId });
      if (r.deletedCount === 0) return res.status(404).json({ message: "Ürün bulunamadı." });
      return res.status(200).json({ message: "✅ Ürün silindi" });
    }

    return res.status(405).json({ message: "Yalnızca GET, POST, PUT, DELETE" });
  } catch (err) {
    console.error("🔥 Urunler API hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
