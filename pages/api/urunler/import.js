import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token yok" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId bulunamadı (token)" });
    }

    const products = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ message: "Geçersiz ürün verisi (array değil)" });
    }

    const docs = products.map((p) => ({
      ...p,
      userId,
      companyId,
      createdBy: userId,
      createdAt: new Date(),
    }));

    await Product.insertMany(docs);

    return res.status(200).json({
      message: "✅ Ürünler başarıyla içe aktarıldı",
      count: docs.length,
    });
  } catch (err) {
    console.error("IMPORT ERROR:", err);
    return res.status(500).json({ message: "Import hatası", error: err.message });
  }
}
