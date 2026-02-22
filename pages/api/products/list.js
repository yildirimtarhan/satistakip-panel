import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // ✅ Token kontrol
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: "Token yok" });
    }

    let decoded = null;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Geçersiz token" });
    }

    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    if (!companyId && !userId) {
      return res.status(400).json({ success: false, message: "Kimlik bulunamadı" });
    }

    const filter = companyId ? { companyId } : { userId };

    // ✅ Ürünleri getir (multi-tenant)
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      products,
      count: products.length,
    });
  } catch (err) {
    console.error("PRODUCT LIST ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
