import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";

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

    // ✅ Tahsilat kaydını bul
    const payDoc = await Transaction.findById(paymentId).lean();
    if (!payDoc) {
      return res.status(404).json({ message: "Kayıt bulunamadı" });
    }

    // ✅ zaten iptal edilmiş mi?
    if (payDoc.isDeleted === true) {
      return res.status(409).json({ message: "Bu kayıt zaten geri alınmış" });
    }

    // ✅ asıl tahsilatı sil (isDeleted)
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

    // ✅ ters fiş oluştur (cari ekstresini düzeltir)
    const cancelTx = await Transaction.create({
      userId: payDoc.userId,
      tenantId: payDoc.tenantId, // multi-tenant için kritik
      accountId: payDoc.accountId,

      type: "tahsilat_cancel",
      direction: payDoc.direction === "alacak" ? "borc" : "alacak",

      amount: payDoc.amount,
      date: new Date(),

      note: `TAHSILAT GERI ALINDI: ${reason || "-"}`,
      paymentMethod: payDoc.paymentMethod || payDoc.method || "cash",

      refPaymentId: payDoc._id,
      isDeleted: false,
    });

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
