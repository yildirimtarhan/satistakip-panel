import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Yetkisiz" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { paymentId, reason } = req.body;
    if (!paymentId) {
      return res.status(400).json({ message: "paymentId zorunlu" });
    }

    // ✅ ESKİ GİBİ: Sadece userId ile ara
    const payDoc = await Transaction.findOne({ 
      _id: paymentId, 
      userId 
    }).lean();

    if (!payDoc) {
      return res.status(404).json({ message: "Kayıt bulunamadı" });
    }

    if (payDoc.isDeleted === true || payDoc.status === "cancelled") {
      return res.status(409).json({ message: "Bu kayıt zaten geri alınmış" });
    }

    // ✅ Orijinal kaydı iptal et
    await Transaction.updateOne(
      { _id: paymentId },
      {
        $set: {
          isDeleted: true,
          status: "cancelled",
          canceledAt: new Date(),
          canceledBy: userId,
          cancelReason: reason || "",
        },
      }
    );

    // ✅ DÜZELTİLDİ: Ters fiş oluştur
    const cancelTx = await Transaction.create({
      userId: payDoc.userId,
      accountId: payDoc.accountId,
      type: payDoc.type === "tahsilat" ? "tahsilat_cancel" : "odeme_cancel",
      direction: payDoc.direction === "alacak" ? "borc" : "alacak", // Ters yön
      amount: payDoc.amount,
      totalTRY: payDoc.totalTRY,
      currency: payDoc.currency || "TRY",
      fxRate: payDoc.fxRate || 1,
      totalFCY: payDoc.totalFCY || 0,
      date: new Date(),
      note: `${payDoc.type === 'tahsilat' ? 'TAHSILAT' : 'ODEME'} GERI ALINDI: ${reason || "-"}`,
      paymentMethod: payDoc.paymentMethod || "cash",
      refPaymentId: payDoc._id,
      isDeleted: false,
      status: "active",
    });

    // ✅ DÜZELTİLDİ: Cari bakiyeyi tersine çevir
    const cari = await Cari.findOne({ _id: payDoc.accountId, userId });
    if (cari) {
      if (payDoc.type === "tahsilat") {
        // Tahsilat geri alınınca bakiye artar (borçlandık)
        cari.bakiye = Number(cari.bakiye || 0) + Number(payDoc.totalTRY || payDoc.amount || 0);
      } else {
        // Ödeme geri alınınca bakiye azalır (alacaklandık)
        cari.bakiye = Number(cari.bakiye || 0) - Number(payDoc.totalTRY || payDoc.amount || 0);
      }
      await cari.save();
    }

    return res.status(200).json({
      message: "✅ Tahsilat geri alındı",
      cancelTxId: cancelTx._id,
    });
  } catch (error) {
    console.error("❌ TAHSILAT CANCEL ERROR:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}