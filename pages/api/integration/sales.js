import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import Cari from "@/models/Cari";
import Transaction from "@/models/Transaction";
import { verifyApiKey } from "@/lib/verifyApiKey";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Sadece POST" });

  try {
    const keyDoc = await verifyApiKey(req);
    await dbConnect();

    const { customer, items, payment } = req.body;

    if (!customer?.email)
      return res.status(400).json({ message: "Email zorunlu" });

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "items boş olamaz" });

    // ==============================
    // CARİ BUL / OLUŞTUR
    // ==============================
    let cari = await Cari.findOne({
      email: customer.email,
      companyId: keyDoc.companyId,
    });

    if (!cari) {
      cari = await Cari.create({
        companyId: keyDoc.companyId,
        name: `${customer.ad || ""} ${customer.soyad || ""}`.trim(),
        email: customer.email,
        phone: customer.phone || "",
        address: customer.adres || "",
        type: "customer",
      });
    }

    let grandTotal = 0;

// Eğer items boş veya quantity 0 ise sadece cari oluştur
const validItems = items.filter(
  (it) => it.quantity && Number(it.quantity) > 0
);

if (validItems.length > 0) {
  for (const it of validItems) {
    const code = it.code?.trim();

    const product = await Product.findOne({
      companyId: keyDoc.companyId,
      $or: [
        { sku: code },
        { barcode: code },
        { modelCode: code },
        { name: code },
      ],
    });

    if (!product)
      return res.status(404).json({ message: `Ürün bulunamadı: ${code}` });

    if (product.stock < it.quantity)
      return res.status(400).json({ message: "Yetersiz stok" });

    product.stock -= it.quantity;
    await product.save();

    grandTotal += it.quantity * it.unitPrice;
  }

  // grandTotal > 0 ise satış oluştur
  if (grandTotal > 0) {
    await Transaction.create({
      companyId: keyDoc.companyId,
      accountId: cari._id,
      type: "sale",
      direction: "alacak",
      amount: grandTotal,
      totalTRY: grandTotal,
      currency: "TRY",
      fxRate: 1,
      totalFCY: grandTotal,
      date: new Date(),
      note: `Web Satış - ${payment?.method || ""}`,
    });
  }
}
    // ==============================
    // TAHSİLAT (Kredi Kartı Paid)
    // ==============================
    if (
      payment?.method === "credit_card" &&
      payment?.status === "paid"
    ) {
      await Transaction.create({
        companyId: keyDoc.companyId,
        accountId: cari._id,
        type: "collection",
        direction: "borc",
        amount: grandTotal,
        totalTRY: grandTotal,
        currency: "TRY",
        fxRate: 1,
        totalFCY: grandTotal,
        date: new Date(),
        note: "Online Kredi Kartı Tahsilat",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Satış işlendi",
      total: grandTotal,
      paymentStatus: payment?.status || "unpaid",
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}