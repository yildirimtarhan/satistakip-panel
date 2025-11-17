// 📁 /pages/api/cari/products.js
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";

export default async function handler(req, res) {
  try {
    // 🔹 MongoDB bağlantısı
    await dbConnect();

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

      const result = await Product.create(newProduct);

      return res.status(201).json({
        message: "✅ Ürün başarıyla eklendi",
        productId: result._id,
      });
    }

    if (req.method === "GET") {
      // 📦 Ürünleri listele
      const list = await Product.find().sort({ createdAt: -1 }).lean();
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
