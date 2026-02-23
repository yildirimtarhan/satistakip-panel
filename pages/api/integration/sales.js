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

    // 🔹 Cari bul veya oluştur
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

    // 🔹 Stok düş
    for (const it of items) {
      const product = await Product.findOne({
        _id: it.productId,
        companyId: keyDoc.companyId,
      });

      if (!product)
        return res.status(404).json({ message: "Ürün bulunamadı" });

      if (product.stock < it.quantity)
        return res.status(400).json({ message: "Yetersiz stok" });

      product.stock -= it.quantity;
      await product.save();

      grandTotal += it.quantity * it.unitPrice;
    }

    // 🔹 1) SATIŞ KAYDI (Cari BORÇ)
    await Transaction.create({
      companyId: keyDoc.companyId,
      accountId: cari._id,
      type: "sale",
      direction: "alacak", // müşteri borçlandı
      amount: grandTotal,
      totalTRY: grandTotal,
      currency: "TRY",
      fxRate: 1,
      totalFCY: grandTotal,
      date: new Date(),
      note: `Web Satış - ${payment?.method || ""}`,
    });

    // 🔹 2) TAHSİLAT (Sadece kredi kartı ve paid ise)
    if (
      payment?.method === "credit_card" &&
      payment?.status === "paid"
    ) {
      await Transaction.create({
        companyId: keyDoc.companyId,
        accountId: cari._id,
        type: "collection",
        direction: "borc", // borç kapatılıyor
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
      message: "Satış işlendi",
      paymentStatus: payment?.status || "unpaid"
    });

  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
}