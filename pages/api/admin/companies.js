import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "GET gerekli" });
  }

  try {
    await dbConnect();

    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token yok" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz" });
    }

    // 🔥 FİRMALAR = TRANSACTION ÜZERİNDEN
    const companyIds = await Transaction.distinct("companyId", {
      companyId: { $ne: null },
    });

    if (!companyIds.length) {
      return res.status(200).json([]);
    }

    // Firma adlarını Cariden al
    const cariler = await Cari.find({
      _id: { $in: companyIds },
    })
      .select("_id unvan")
      .lean();

    const companies = cariler.map((c) => ({
      _id: c._id.toString(),
      name: c.unvan,
    }));

    res.status(200).json(companies);
  } catch (err) {
    console.error("ADMIN COMPANIES ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}
