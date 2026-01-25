import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Token geçersiz" });
    }

    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || null;

    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "Ürün ID gerekli" });

    // ✅ Multi-tenant filtre (bozmadan)
    const filter = { _id: id };

    // Eski yapıya uyumluluk (userId)
    if (userId) filter.userId = String(userId);

    // Yeni sistem (companyId)
    if (companyId) filter.companyId = companyId;

    const product = await Product.findOne(filter);

    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    return res.status(200).json(product);
  } catch (err) {
    console.error("PRODUCT GET ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
