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

    // 🔐 TOKEN
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token yok" });

    const token = auth.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id || decoded._id;
    const companyIdRaw = decoded.companyId || null;
    const role = decoded.role || "user";

    // 📥 PARAMS
    const { accountId, start, end } = req.query;
    if (!accountId) {
      return res.status(400).json({ message: "accountId zorunlu" });
    }

    const accountObjectId = new mongoose.Types.ObjectId(accountId);

    const startDate = start ? new Date(start) : new Date("1970-01-01");
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // 🧾 CARİ
    const cari = await Cari.findById(accountObjectId);
    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    // 🧠 TENANT FILTER
    const trxFilter = {
      accountId: accountObjectId,
      date: { $gte: startDate, $lte: endDate },
    };

    if (role !== "admin" && companyIdRaw) {
      trxFilter.companyId = new mongoose.Types.ObjectId(companyIdRaw);
    }

    // 📚 TRANSACTIONS
    const txs = await Transaction.find(trxFilter).sort({ date: 1 }).lean();

    // 🧮 EKSTRE
    let bakiye = 0;
    const rows = [];

    for (const t of txs) {
      // ✅ TL bazında miktar (mevcut sistemin)
      const amountTRY = Number(t.amount || t.totalTRY || 0);
      const borc = t.direction === "borc" ? amountTRY : 0;
      const alacak = t.direction === "alacak" ? amountTRY : 0;

      bakiye = bakiye + borc - alacak;

      // ✅ Döviz bilgileri (yeni ek)
      const currency = t.currency || "TRY";
      const fxRate = Number(t.fxRate || 1);

      // ✅ Döviz borç/alacak (FCY)
      // totalFCY yoksa TRY kabul edilir
      const amountFCY =
        currency === "TRY"
          ? amountTRY
          : Number(t.totalFCY || t.amountFCY || 0);

      const borcFCY = t.direction === "borc" ? amountFCY : 0;
      const alacakFCY = t.direction === "alacak" ? amountFCY : 0;

      rows.push({
        tarih: t.date,

        // ✅ SADECE BU KISIM GENİŞLETİLDİ
        aciklama:
          t.type === "sale"
            ? "Satış"
            : t.type === "sale_return"
            ? "Satış İadesi"
            : t.type === "sale_cancel"
            ? "Satış İptali"
            : t.type === "payment"
            ? "Tahsilat"
            : t.type === "purchase"
            ? "Alış"
            : t.type === "expense"
            ? "Gider"
            : t.direction === "borc"
            ? "Ödeme"
            : t.direction === "alacak"
            ? "Tahsilat"
            : "-",

        // ✅ TL kolonları (mevcut)
        borc,
        alacak,
        bakiye,

        // ✅ EKLENDİ: Para / Kur / Döviz Borç-Alacak
        currency,
        fxRate,
        borcFCY,
        alacakFCY,

        _id: t._id,
      });
    }

    return res.status(200).json({
      success: true,
      rows,
      bakiye,
    });
  } catch (err) {
    console.error("❌ EKSTRE API HATASI:", err);
    return res.status(500).json({
      message: "Cari ekstre alınamadı",
      error: err.message,
    });
  }
}
