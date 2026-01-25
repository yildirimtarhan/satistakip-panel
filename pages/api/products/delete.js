import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method !== "DELETE") {
      return res.status(405).json({ message: "Sadece DELETE destekleniyor" });
    }

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

    // Eski uyumluluk
    if (userId) filter.userId = String(userId);

    // Yeni tenant
    if (companyId) filter.companyId = companyId;

    const deleted = await Product.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json({
        message: "Ürün bulunamadı veya bu ürünü silme yetkiniz yok",
      });
    }

    return res.status(200).json({
      message: "✅ Ürün silindi",
      deletedId: deleted._id,
    });
  } catch (err) {
    console.error("PRODUCT DELETE ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
