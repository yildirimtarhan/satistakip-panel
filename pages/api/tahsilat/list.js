import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Yetkisiz" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { accountId } = req.query;

    if (!accountId) {
      return res.status(400).json({ message: "accountId zorunlu" });
    }

    // ✅ DÜZELTİLDİ: Sadece userId ile filtrele (companyId yok)
    const match = {
      userId,
      accountId,
    };

    // ✅ Tüm tahsilat/ödeme tipleri
    match.type = { 
      $in: ["tahsilat", "odeme", "payment", "collection", "tahsilat_cancel", "odeme_cancel"] 
    };

    console.log("TAHSILAT LIST QUERY:", match);

    const list = await Transaction.find(match)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    console.log(`✅ ${list.length} kayıt bulundu`);

    return res.json(list);
  } catch (err) {
    console.error("TAHSILAT LIST ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}