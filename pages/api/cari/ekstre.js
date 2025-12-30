import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import mongoose from "mongoose";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET desteklenir" });
  }

  try {
    await dbConnect();

    /* =======================
       🔐 TOKEN
    ======================= */
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Token yok" });
    }

    const token = auth.replace("Bearer ", "");
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded.id || decoded._id;
    const companyId = decoded.companyId || decoded.firmaId || null;

    /* =======================
       📥 PARAMS
    ======================= */
    const { accountId, start, end } = req.query;
    if (!accountId) {
      return res.status(400).json({ message: "accountId zorunlu" });
    }

    const startDate = start ? new Date(start) : new Date("1970-01-01");
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);

    /* =======================
       🧾 CARİ
    ======================= */
    const cari = await Cari.findOne({
      _id: accountId,
      ...(companyId ? { companyId } : {}),
    });

    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    /* =======================
       📚 TRANSACTIONS
    ======================= */
    const txs = await Transaction.find({
      accountId: new mongoose.Types.ObjectId(accountId),
      date: { $gte: startDate, $lte: endDate },
      ...(companyId ? { companyId } : {}),
    }).sort({ date: 1 });

    /* =======================
       🧮 EKSTRE OLUŞTUR
    ======================= */
    let bakiye = 0;
    const rows = [];

    for (const t of txs) {
      let borc = 0;
      let alacak = 0;

      if (
        t.type === "sale" ||
        t.type === "purchase" ||
        t.type === "odeme"
      ) {
        borc = Number(t.totalTRY || t.amount || 0);
      }

      if (t.type === "tahsilat") {
        alacak = Number(t.totalTRY || t.amount || 0);
      }

      bakiye = bakiye + borc - alacak;

      rows.push({
        tarih: t.date,
        aciklama:
          t.type === "tahsilat"
            ? "Tahsilat"
            : t.type === "odeme"
            ? "Ödeme"
            : t.type === "sale"
            ? "Satış"
            : t.type === "purchase"
            ? "Alış"
            : t.type,
        borc,
        alacak,
        bakiye,
        _id: t._id,
      });
    }

    return res.status(200).json({
      cari: {
        _id: cari._id,
        ad: cari.ad,
      },
      rows,
    });
  } catch (err) {
    console.error("❌ EKSTRE API HATASI:", err);
    return res.status(500).json({
      message: "Cari ekstre alınamadı",
      error: err.message,
    });
  }
}
