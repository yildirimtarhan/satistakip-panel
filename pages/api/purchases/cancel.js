import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import Purchase from "@/models/Purchase";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    await dbConnect();

    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Token yok" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId;
    const companyId = decoded.companyId || "";

    const { purchaseId } = req.body;
    if (!purchaseId) {
      return res.status(400).json({ message: "purchaseId gerekli" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1️⃣ Alışı bul
      const filter = { _id: purchaseId, userId };
      if (companyId) filter.companyId = companyId;

      const purchase = await Purchase.findOne(filter).session(session);
      if (!purchase) {
        throw new Error("Alış bulunamadı");
      }

      if (purchase.status === "cancelled") {
        throw new Error("Bu alış zaten iptal edilmiş");
      }

      // 2️⃣ STOK GERİ AL
      for (const item of purchase.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stok: -item.quantity } },
          { session }
        );
      }

      const totalAmount = Number(purchase.totalTRY || purchase.total || 0);

      // 3️⃣ CARİ BORÇ DÜŞ (ALACAK YAZ)
      await Transaction.create(
        [
          {
            userId,
            companyId,
            accountId: purchase.accountId,

            type: "purchase_cancel",
            direction: "alacak",

            amount: totalAmount,
            currency: "TRY",
            date: new Date(),

            refType: "purchase",
            refId: purchase._id,

            note:
              `Alış İptal` +
              (purchase.invoiceNo
                ? ` | Fatura: ${purchase.invoiceNo}`
                : ""),
          },
        ],
        { session }
      );

      // 4️⃣ CARİ BAKİYE DÜZELT
      await Cari.findByIdAndUpdate(
        purchase.accountId,
        { $inc: { bakiye: -totalAmount } },
        { session }
      );

      // 5️⃣ PURCHASE STATUS
      purchase.status = "cancelled";
      await purchase.save({ session });

      await session.commitTransaction();
      res.status(200).json({ success: true });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("PURCHASE CANCEL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}
