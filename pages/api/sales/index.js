import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Yetkisiz" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filter = {
      type: "sale",
      isDeleted: { $ne: true },
    };

    if (decoded.role !== "admin" && decoded.companyId) {
      filter.companyId = new mongoose.Types.ObjectId(decoded.companyId);
    }

    const sales = await Transaction.find(filter)
      .select("saleNo date accountId accountName currency totalTRY")
      .sort({ date: -1 })
      .lean();

    res.json(sales);
  } catch (err) {
    console.error("SALES INDEX ERROR:", err);
    res.status(500).json({ message: "Satışlar alınamadı" });
  }
}
