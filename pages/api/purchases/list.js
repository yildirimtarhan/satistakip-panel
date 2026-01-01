import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari"; // 🔴 MUTLAKA OLMALI
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    await dbConnect();

    // 🔐 TOKEN
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || null;

    // 🔍 FILTER
    const filter = {
      userId,
      type: "purchase", // 👈 SADECE ALIŞLAR
    };

    if (companyId) {
      filter.companyId = companyId;
    }

    const purchases = await Transaction.find(filter)
      .populate("accountId", "unvan ad firmaAdi email")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.status(200).json(purchases);
  } catch (err) {
    console.error("PURCHASE LIST ERROR:", err);
    return res.status(500).json({
      message: "Alışlar getirilemedi",
      error: err.message,
    });
  }
}
