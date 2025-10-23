// 📁 /pages/api/cari/products.js
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    // 🔹 MongoDB bağlantısı
    const client = await clientPromise;
    const db = client.db("satistakip");
    const products = db.collection("products");

    if (req.method === "POST") {
      // ✅ Yeni ürün ekleme
      const { name, buyPrice, sellPrice, stock, currency } = req.body;

      if (!name || !buyPrice || !sellPrice || !currency) {
        return res.status(400).json({ message: "⚠️ Eksik bilgi gönderildi." });
      }

      const newProduct = {
        name: name.trim(),
        buyPrice: parseFloat(buyPrice),
        sellPrice: parseFloat(sellPrice),
        stock: parseInt(stock) || 0,
        currency, // "TRY", "USD" veya "EUR"
        createdAt: new Date(),
      };

      const result = await products.insertOne(newProduct);
      return res.status(201).json({
        message: "✅ Ürün başarıyla eklendi",
        productId: result.insertedId,
      });
    }

    if (req.method === "GET") {
      // 📦 Ürünleri listele
      const list = await products.find().sort({ createdAt: -1 }).toArray();
      return res.status(200).json(list);
    }

    return res
      .status(405)
      .json({ message: "❌ Yalnızca GET ve POST metodları desteklenir." });
  } catch (error) {
    console.error("🔥 Ürün API hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası oluştu.",
      error: error.message,
    });
  }
}
