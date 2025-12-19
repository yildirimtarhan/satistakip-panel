import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "GET only" });
  }

  try {
    await dbConnect();

    // 🔐 Token kontrol
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Token yok" });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    const { accountId, start, end } = req.query;

    if (!accountId) {
      return res.status(400).json({ message: "accountId zorunlu" });
    }

    // 🔎 FİLTRE
    const filter = {
      accountId: new mongoose.Types.ObjectId(accountId),
    };

    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = new Date(start);
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999); // 🔥 KRİTİK
        filter.date.$lte = endDate;
      }
    }

    // 📥 TRANSACTIONLAR
    const txs = await Transaction.find(filter).sort({ date: 1 });

    let bakiye = 0;

    const rows = txs.map((t) => {
      const tutar = Number(t.amount || t.totalTRY || 0);

      const borc =
        t.type === "purchase" || t.type === "sale" ? tutar : 0;

      const alacak =
        t.type === "payment" || t.type === "collection" ? tutar : 0;

      bakiye += borc - alacak;

      return {
        _id: t._id,
        tarih: t.date,
        aciklama:
          t.description ||
          t.note ||
          t.invoiceNo ||
          "",
        borc,
        alacak,
        bakiye,
      };
    });

    return res.json({
      success: true,
      rows,
      bakiye,
    });
  } catch (err) {
    console.error("Cari ekstre hata:", err);
    return res.status(500).json({ message: "Cari ekstre alınamadı" });
  }
}
