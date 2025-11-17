// 📁 /pages/api/cari/balance.js (dosya adını sen belirlemiştin)
import dbConnect from "@/lib/mongodb";
import { Types } from "mongoose";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "accountId (id) gerekli" });

    await dbConnect();

    let accountObjectId;
    try {
      accountObjectId = new Types.ObjectId(id);
    } catch {
      return res.status(400).json({ message: "Geçersiz accountId" });
    }

    const transactions = await Transaction.find({ accountId: accountObjectId }).lean();

    let borc = 0, alacak = 0;
    transactions.forEach(t => {
      const val = Number(t.totalTRY || 0);
      if (t.type === "purchase") borc += val;
      if (t.type === "sale") alacak += val;
    });

    return res.json({
      borc,
      alacak,
      bakiye: Number((alacak - borc).toFixed(2))
    });

  } catch (error) {
    console.error("🔥 Cari bakiye API hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
