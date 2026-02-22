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

   const userId = decoded.userId || decoded.id || decoded._id;

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

   // 🧾 CARİ (TOLERANSLI)
const cari = await Cari.findOne({
  _id: accountObjectId,
  $or: [
    { companyId: new mongoose.Types.ObjectId(companyIdRaw) },
    { companyId: String(companyIdRaw) },
     { companyId: { $exists: false } }, // ✅ BUNU EKLE
  ],
});

if (!cari) {
  console.error("❌ Cari bulunamadı:", {
    accountId: accountObjectId.toString(),
    companyIdRaw,
  });
  return res.status(404).json({ message: "Cari bulunamadı" });
}


// 🧠 TENANT FILTER
const trxFilter = {
  accountId: accountObjectId,
  date: { $gte: startDate, $lte: endDate },
};




// 📚 TRANSACTIONS
const txs = await Transaction.find(trxFilter).sort({ date: 1 }).lean();

    // 🧮 EKSTRE
    let bakiye = 0;
    const rows = [];

    for (const t of txs) {
  // 1) Kur / Para birimi toleranslı
  const currency = (t.currency || "TRY").toString().toUpperCase();
  const fxRate = Number(t.fxRate ?? t.rate ?? t.exchangeRate ?? 1) || 1;

  // 2) TRY tutar (mevcut sistemin: amount veya totalTRY)
  const amountTRY = Number(t.totalTRY ?? t.amount ?? 0) || 0;

  // 3) FCY tutar:
  //    - Eğer DB’de totalFCY/amountFCY varsa onu kullan
  //    - Yoksa (currency TRY değilse) TRY / kur’dan üret
  const amountFCYraw = Number(t.totalFCY ?? t.amountFCY ?? 0) || 0;
  const amountFCY =
    currency === "TRY"
      ? amountTRY
      : (amountFCYraw > 0 ? amountFCYraw : (fxRate > 0 ? amountTRY / fxRate : 0));

  // 4) Borç/Alacak TRY
  const borc = t.direction === "borc" ? amountTRY : 0;
  const alacak = t.direction === "alacak" ? amountTRY : 0;

  bakiye = bakiye + borc - alacak;

  // 5) Borç/Alacak FCY
  const borcFCY = t.direction === "borc" ? amountFCY : 0;
  const alacakFCY = t.direction === "alacak" ? amountFCY : 0;

  // 6) Açıklama (asla boş kalmasın)
  const aciklama =
    t.type === "sale" ? "Satış" :
    t.type === "sale_return" ? "Satış İadesi" :
    t.type === "sale_cancel" ? "Satış İptali" :
    t.type === "payment" ? "Tahsilat" :
    t.type === "purchase" ? "Alış" :
    t.type === "expense" ? "Gider" :
    t.direction === "borc" ? "Ödeme" :
    t.direction === "alacak" ? "Tahsilat" :
    (t.note || "-");

 rows.push({
  // 🖥 Dashboard için (MEVCUT – DOKUNMADIK)
  tarih: t.date || t.createdAt || new Date(),
  aciklama,

  borc,
  alacak,
  bakiye,

  currency,
  fxRate,
  borcFCY,
  alacakFCY,

  _id: t._id,

  // 🧾 PDF Engine için (YENİ – EKLENDİ)
  date: t.date || t.createdAt || new Date(),
  description: aciklama,

  borcDoviz: borcFCY,
  alacakDoviz: alacakFCY,
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
