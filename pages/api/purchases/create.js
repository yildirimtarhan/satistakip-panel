// 📁 pages/api/purchases/create.js
import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
    if (!auth) return res.status(401).json({ message: "Token yok" });

    const token = auth.split(" ")[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);

// 🔥 BURASI KRİTİK
const userId = decoded.userId;

if (!userId) {
  return res.status(401).json({ message: "User bulunamadı" });
}


    const {
      accountId,
      items,
      invoiceDate,
      invoiceNo,
      orderNo,
      note,
    } = req.body;

    if (!accountId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Eksik veri" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let totalTRY = 0;

      // 1️⃣ STOK ARTIR
      for (const r of items) {
        const qty = Number(r.quantity || 0);
        const price = Number(r.unitPrice || 0);
        if (!r.productId || qty <= 0) continue;

        await Product.findByIdAndUpdate(
          r.productId,
          { $inc: { stok: qty } },
          { session }
        );

        totalTRY += qty * price;
      }

     // 2️⃣ CARİ EKSTRE → BORÇ (FINAL)
await Transaction.create(
  [
    {
      companyId: decoded.companyId, // 🔥 ZORUNLU (multi-tenant)
      userId: decoded.userId,        // işlemi yapan kullanıcı

      accountId,

      type: "purchase",
      direction: "borc",

      amount: Number(totalTRY.toFixed(2)),
      currency: "TRY",

      date: invoiceDate ? new Date(invoiceDate) : new Date(),

      note:
        `Ürün Alış` +
        (invoiceNo ? ` | Fatura: ${invoiceNo}` : "") +
        (orderNo ? ` | Sipariş: ${orderNo}` : "") +
        (note ? ` | ${note}` : ""),
    },
  ],
  { session }
);


      // 3️⃣ CARİ BAKİYE
      await Cari.findByIdAndUpdate(
        accountId,
        { $inc: { bakiye: totalTRY } },
        { session }
      );

      await session.commitTransaction();
      return res.status(200).json({
        success: true,
        message: "✅ Ürün alış kaydedildi",
      });
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("PURCHASE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
}
