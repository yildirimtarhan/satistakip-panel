// 📁 /pages/api/urunler/index.js
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await dbConnect(); // MongoDB bağlan

    // 🔐 Token kontrolü
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token eksik" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ------------------------------------
    // 📌 GET — Ürün Listele
    // ------------------------------------
    if (req.method === "GET") {
      const list = await Product.find({});
      return res.status(200).json(list);
    }

    // ------------------------------------
    // 📌 POST — Ürün Ekle
    // ------------------------------------
    if (req.method === "POST") {
      const b = req.body || {};

      if (!b.ad || !b.satisFiyati)
        return res.status(400).json({ message: "Ürün adı ve satış fiyatı gerekli" });

      const newDoc = await Product.create({
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
        stok: Number(b.stok || 0),
        stokUyari: Number(b.stokUyari || 0),

        paraBirimi: b.paraBirimi || "TRY",
        kdvOrani: Number(b.kdvOrani || 20),

        n11CategoryId: b.n11CategoryId || null,
        n11ProductId: null, // N11 tarafı ayrı endpoint’te güncellenecek
      });

      return res.status(201).json({
        message: "Ürün eklendi",
        _id: newDoc._id,
      });
    }

    // ------------------------------------
    // 📌 PUT — Ürün Güncelle
    // ------------------------------------
    if (req.method === "PUT") {
      const { id } = req.query;
      await Product.findByIdAndUpdate(id, req.body);
      return res.status(200).json({ message: "Ürün güncellendi" });
    }

    // ------------------------------------
    // 📌 DELETE — Ürün Sil
    // ------------------------------------
    if (req.method === "DELETE") {
      const { id } = req.query;
      await Product.findByIdAndDelete(id);
      return res.status(200).json({ message: "Ürün silindi" });
    }

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (err) {
    console.error("🔥 Ürün API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
