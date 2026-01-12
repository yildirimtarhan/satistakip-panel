import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import Cari from "@/models/Cari";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST" });
  }

  try {
    await dbConnect();

    // 🔐 TOKEN
    const token = req.headers.authorization?.replace("Bearer ", "");
    const user = verifyToken(token);

    if (!user?.userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const {
      accountId,
      date,
      currency = "TRY",
      fxRate = 1,
      paymentType = "open",
      partialPaymentTRY = 0,
      note = "",
      saleNo,
      items = [],
    } = req.body;

    if (!accountId || !items.length || !saleNo) {
      return res.status(400).json({ message: "Eksik veri" });
    }

    // 🚫 AYNI SALE NO (TENANT BAZLI)
    const exists = await Transaction.findOne({
      type: "sale",
      saleNo,
      userId: user.userId,
      isDeleted: { $ne: true },
    }).lean();

    if (exists) {
      return res
        .status(409)
        .json({ message: "Bu satış numarası zaten mevcut" });
    }

    // 🧾 CARİ SNAPSHOT
    let accountName = "";
    const cari = await Cari.findById(accountId).lean();
    if (cari) {
      accountName = cari.unvan || cari.firmaAdi || cari.ad || "";
    }

    // 🧮 TOPLAMLAR
    let subTotal = 0;
    let vatTotal = 0;

    const normalizedItems = items.map((i) => {
      const qty = Number(i.quantity || 1);
      const price = Number(i.unitPrice || 0);
      const vatRate = Number(i.vatRate || 0);

      const lineSub = qty * price;
      const lineVat = lineSub * (vatRate / 100);

      subTotal += lineSub;
      vatTotal += lineVat;

      return {
        productId: i.productId,
        name: i.name,
        barcode: i.barcode,
        sku: i.sku,
        quantity: qty,
        unitPrice: price,
        vatRate,
        total: lineSub + lineVat,
      };
    });

    const grandTotal = subTotal + vatTotal;
    const totalTRY =
      currency === "TRY" ? grandTotal : grandTotal * fxRate;

    // 🧾 SATIŞ TRANSACTION
    const saleTransaction = await Transaction.create({
      userId: user.userId,
      companyId: user.companyId || "",
      createdBy: user.userId,

      type: "sale",
      saleNo,
      accountId,
      accountName,

      date: date ? new Date(date) : new Date(),
      paymentMethod: paymentType,
      note,

      currency,
      fxRate,
      items: normalizedItems,
      totalTRY,

      direction: "borc",
      amount: totalTRY,
    });

    // 💰 KISMİ TAHSİLAT
    if (Number(partialPaymentTRY) > 0) {
      await Transaction.create({
        userId: user.userId,
        companyId: user.companyId || "",
        createdBy: user.userId,

        type: "payment",
        saleNo,
        accountId,
        accountName,

        direction: "alacak",
        amount: Number(partialPaymentTRY),
        paymentMethod: paymentType,
        note: "Kısmi tahsilat",
        date: date ? new Date(date) : new Date(),
        currency: "TRY",
        fxRate: 1,
        totalTRY: Number(partialPaymentTRY),
      });
    }

    // 📦 STOK DÜŞ
    for (const i of normalizedItems) {
      if (i.productId) {
        await Product.findByIdAndUpdate(i.productId, {
          $inc: { stock: -i.quantity },
        });
      }
    }

    return res.status(200).json({
      success: true,
      saleNo,
      transactionId: saleTransaction._id,
    });
  } catch (e) {
    console.error("SATIS CREATE ERROR:", e);
    return res.status(500).json({
      message: e?.message || "Satış oluşturulamadı",
    });
  }
}
