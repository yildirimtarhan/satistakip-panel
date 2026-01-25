import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // 🔐 Token kontrol
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Token geçersiz" });
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    const companyId = decoded.companyId || null;

    // ✅ Multi-tenant filtre
    const filter = { userId: String(userId) };
    if (companyId) filter.companyId = companyId;

    const products = await Product.find(filter).sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (err) {
    console.error("PRODUCT LIST ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
