import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // 🔐 Token
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Token yok" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || null;

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: "ID yok" });
    }

    // ✅ SATIN ALMA TRANSACTION'I BUL
    const purchase = await Transaction.findOne({
      _id: id,
      type: "purchase",
      ...(companyId ? { companyId } : { userId }),
    })
      .populate("accountId")   // 🧾 Cari
      .lean();

    if (!purchase) {
      return res.status(404).json({ message: "Kayıt bulunamadı" });
    }

    return res.status(200).json(purchase);
  } catch (err) {
    console.error("PURCHASE DETAIL ERROR:", err);
    return res.status(500).json({
      message: "Alış detayı alınamadı",
      error: err.message,
    });
  }
}
