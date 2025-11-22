// 📁 /pages/api/n11/products/local.js
import dbConnect from "@/lib/mongodb";
import N11Product from "@/models/N11Product";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  try {
    await dbConnect();

    const products = await N11Product.find({})
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    console.error("N11 local product list hata:", err.message);
    return res.status(500).json({
      success: false,
      message: "N11 ürünleri veritabanından alınamadı",
      error: err.message,
    });
  }
}
