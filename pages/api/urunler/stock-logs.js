import dbConnect from "@/lib/mongodb";
import StockLog from "@/models/StockLog";
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

    const logs = await StockLog.find({ companyId }).sort({ createdAt: -1 });

    return res.status(200).json(logs);
  } catch (err) {
    console.error("STOCK LOGS ERROR:", err);
    return res.status(500).json({ message: "Stock log hatası", error: err.message });
  }
}
