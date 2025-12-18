import jwt from "jsonwebtoken";
import Counter from "@/models/Counter";
import dbConnect from "@/lib/mongodb";


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  try {
    // 🔐 TOKEN
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Token yok" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const companyId = decoded.companyId || decoded.userId;
    if (!companyId) {
      return res.status(400).json({ message: "companyId bulunamadı" });
    }

    const year = new Date().getFullYear();

    // 🔢 ATOMİK SAYAÇ
    const counter = await Counter.findOneAndUpdate(
      { key: "saleNo", companyId, year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const saleNo = `SAT-${year}-${String(counter.seq).padStart(6, "0")}`;

    return res.status(200).json({ saleNo });
  } catch (err) {
    console.error("❌ NEXT SALE NO ERROR:", err);
    return res.status(500).json({
      message: "SaleNo oluşturulamadı",
      error: err.message,
    });
  }
}
