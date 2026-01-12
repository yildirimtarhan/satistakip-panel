import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Yetkisiz" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { saleNo } = req.query;
    if (!saleNo) {
      return res.status(400).json({ message: "saleNo gerekli" });
    }

    const filter = {
      type: "sale",
      saleNo,
      isDeleted: { $ne: true },
    };

    if (decoded.role !== "admin" && decoded.companyId) {
      filter.companyId = new mongoose.Types.ObjectId(decoded.companyId);
    }

    const sale = await Transaction.findOne(filter).lean();

    if (!sale) {
      return res.status(404).json({ message: "Satış bulunamadı" });
    }

    return res.json({
      saleNo: sale.saleNo,
      accountId: sale.accountId,
      accountName: sale.accountName || "", // 🔥 EKLENDİ
      currency: sale.currency,
      fxRate: sale.fxRate,
      date: sale.date,
      paymentType: sale.paymentType,
      note: sale.note || "",
      totalTRY: sale.totalTRY || 0, // 🔥 EKLENDİ
      items: (sale.items || []).map((i) => ({
        productId: i.productId,
        name: i.name,
        qty: i.quantity,
        unitPrice: i.unitPrice,
        vatRate: i.vatRate,
        total: i.total || i.quantity * i.unitPrice,
      })),
    });
  } catch (err) {
    console.error("SALE GET ERROR:", err);
    return res.status(500).json({ message: "Satış okunamadı" });
  }
}
