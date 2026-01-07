import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // 🔐 AUTH (MULTI-TENANT GÜVENLİ)
    const user = await verifyToken(req);
    const userId = user?.userId || user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    // 📦 PAYLOAD
    const {
      accountId,
      date,
      currency = "TRY",
      fxRate = 1,
      manualRate = false,
      paymentType = "open",
      partialPaymentTRY = 0,
      note = "",
      saleNo,
      items,
    } = req.body;

    // 🛑 ZORUNLU KONTROLLER
    if (!accountId || !date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Eksik veri" });
    }

    // 🔢 SATIŞ TOPLAMLARI
    let totalTRY = 0;

    // 🧾 SATIŞ TRANSACTIONLARI
    const saleTransactions = [];

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const vatRate = Number(item.vatRate || 0);

      if (!item.productId || qty <= 0) continue;

      const lineTotal = qty * price * (1 + vatRate / 100);
      const lineTRY = currency === "TRY" ? lineTotal : lineTotal * fxRate;

      totalTRY += lineTRY;

      saleTransactions.push({
        accountId,
        type: "sale",
        description: "Satış",
        productId: item.productId,
        quantity: qty,
        price,
        vatRate,
        currency,
        fxRate,
        debit: lineTRY,
        credit: 0,
        userId,
        date,
        note,
        saleNo,
      });

      // 📉 STOK DÜŞ
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -qty },
      });
    }

    if (!saleTransactions.length) {
      return res.status(400).json({ message: "Satış kalemi yok" });
    }

    // 💾 SATIŞI YAZ
    await Transaction.insertMany(saleTransactions);

    // 💰 KISMİ TAHSİLAT
    if (Number(partialPaymentTRY) > 0) {
      await Transaction.create({
        accountId,
        type: "payment",
        description: "Kısmi Tahsilat",
        debit: 0,
        credit: Number(partialPaymentTRY),
        currency: "TRY",
        fxRate: 1,
        userId,
        date,
        note,
        saleNo,
      });
    }

    // ✅ OK
    return res.status(200).json({
      success: true,
      message: "Satış başarıyla kaydedildi",
      saleNo,
      totalTRY,
      partialPaymentTRY: Number(partialPaymentTRY),
    });
  } catch (err) {
    console.error("SATIS CREATE ERROR:", err);
    return res.status(500).json({
      message: "Satış kaydedilemedi",
      error: err.message,
    });
  }
}
