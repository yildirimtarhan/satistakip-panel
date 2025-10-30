// 📁 /pages/api/urunler/index.js
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // ✅ Token kontrolü
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token eksik" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = await clientPromise;
    const db = client.db("satistakip");
    const products = db.collection("products");

    // ============== 📌 GET — Ürün Listesi =====================
    if (req.method === "GET") {
      const list = await products
        .find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .toArray();
      return res.status(200).json(list);
    }

    // ============== ➕ POST — Yeni Ürün Ekle ==================
    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.ad || !body.satisFiyati) {
        return res.status(400).json({ message: "Ürün adı ve satış fiyatı zorunlu" });
      }

      const doc = {
        ad: body.ad,
        kategori: body.kategori || "",
        barkod: body.barkod || "",
        sku: body.sku || "",
        birim: body.birim || "Adet",

        alisFiyati: Number(body.alisFiyati || 0),
        satisFiyati: Number(body.satisFiyati || 0),
        stok: Number(body.stok || 0),
        paraBirimi: body.paraBirimi || "TRY",
        kdvOrani: Number(body.kdvOrani ?? 20),

        variation: body.variation || [],

        resimUrl: body.resimUrl || "",

        userId: decoded.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await products.insertOne(doc);
      return res.status(201).json({ message: "✅ Ürün eklendi", _id: result.insertedId });
    }

    // ============== ✏️ PUT — Ürün Güncelle ===================
    if (req.method === "PUT") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: "Ürün ID gerekli" });

      const updateData = {
        ...req.body,
        updatedAt: new Date(),
      };
      delete updateData.userId;
      delete updateData.createdAt;

      await products.updateOne(
        { _id: new ObjectId(id), userId: decoded.userId },
        { $set: updateData }
      );

      return res.status(200).json({ message: "✅ Ürün güncellendi" });
    }

    // ============== 🗑 DELETE — Ürün Sil =====================
    if (req.method === "DELETE") {
      const { id } = req.query;
      await products.deleteOne({ _id: new ObjectId(id), userId: decoded.userId });
      return res.status(200).json({ message: "✅ Ürün silindi" });
    }

    return res.status(405).json({ message: "Method not allowed" });

  } catch (err) {
    console.error("🔥 Ürün API hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
