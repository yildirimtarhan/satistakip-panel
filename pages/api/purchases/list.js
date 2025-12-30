// 📁 pages/api/purchases/list.js
import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET desteklenir" });
  }

  try {
    await dbConnect();

    // 🔐 Token
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    const token = auth.split(" ")[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const { role, companyId } = decoded;

    // 🔍 FİLTRE
    const filter = {
  type: "purchase",
  companyId: decoded.companyId, // 🔥 HER ZAMAN
};


    // user → sadece kendi firması
    if (role !== "admin") {
      filter.companyId = companyId;
    }

    // 📥 Alışları çek
    const list = await Transaction.find(filter)
      .populate("accountId", "ad")
      .sort({ date: -1 })
      .lean();

    return res.status(200).json(list);
  } catch (err) {
    console.error("PURCHASE LIST ERROR:", err);
    return res.status(500).json({
      message: "Alışlar alınamadı",
      error: err.message,
    });
  }
}
