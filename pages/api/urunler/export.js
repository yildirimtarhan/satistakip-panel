import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token yok" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId bulunamadı (token)" });
    }

    const products = await Product.find({ companyId }).sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    return res.status(500).json({ message: "Export hatası", error: err.message });
  }
}
