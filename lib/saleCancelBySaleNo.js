/**
 * Satış iptali: saleNo + companyId ile orijinal satışı bulur, iptal fişi oluşturur.
 * Webhook (HB iptal) veya otomatik senkronizasyon için kullanılır.
 */
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import Transaction from "@/models/Transaction";

export async function createSaleCancelBySaleNoAndCompany(saleNo, companyId) {
  if (!saleNo || !companyId) return { ok: false, message: "saleNo ve companyId gerekli" };
  await dbConnect();

  const companyIdStr = String(companyId);
  const saleDocs = await Transaction.find({
    companyId: companyIdStr,
    type: "sale",
    saleNo: String(saleNo),
    direction: { $in: ["borc", "debit"] },
    $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
  }).lean();

  if (!saleDocs.length) {
    return { ok: false, message: "Satış bulunamadı" };
  }

  const existingCancel = await Transaction.findOne({
    companyId: companyIdStr,
    type: "sale_cancel",
    $or: [{ refSaleNo: saleNo }, { saleNo: String(saleNo) }],
  }).lean();

  if (existingCancel) {
    return { ok: true, already: true, message: "Zaten iptal edilmiş" };
  }

  const saleId = new mongoose.Types.ObjectId(saleDocs[0]._id);
  await Transaction.updateOne(
    { _id: saleId },
    {
      $set: {
        isDeleted: true,
        status: "cancelled",
        canceledAt: new Date(),
        canceledBy: "hepsiburada-webhook",
        cancelReason: "Hepsiburada sipariş iptali (webhook)",
      },
    }
  );

  const first = saleDocs[0];
  const totalTRY = Number(first.totalTRY ?? first.amount ?? 0) || 0;
  await Transaction.create({
    userId: first.userId || null,
    companyId: companyIdStr,
    accountId: first.accountId || null,
    accountName: first.accountName || "",
    type: "sale_cancel",
    direction: "alacak",
    saleNo: String(saleNo),
    refSaleNo: String(saleNo),
    date: new Date(),
    note: `Satış iptali (${saleNo}) - Hepsiburada webhook`,
    currency: first.currency || "TRY",
    fxRate: Number(first.fxRate ?? 1) || 1,
    amount: totalTRY,
    totalTRY,
    items: first.items || [],
  });

  return { ok: true, message: "Satış iptal edildi" };
}
