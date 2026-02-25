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

    // ==============================
    // STOK DÜŞME MANTIĞI
    // ==============================
    for (const it of items) {
      const code = it.code?.trim();

      if (!code)
        return res.status(400).json({ message: "Ürün kodu gerekli" });

      const product = await Product.findOne({
        companyId: keyDoc.companyId,
        $or: [
          { "variants.sku": code },
          { "variants.barcode": code },
          { model: code },
          { name: code },
        ],
      });

      if (!product)
        return res.status(404).json({ message: `Ürün bulunamadı: ${code}` });

      // Variant kontrol
      let variant = product.variants.find(
        (v) => v.sku === code || v.barcode === code
      );

      // Eğer variant varsa
      if (variant) {
        if (variant.stock < it.quantity)
          return res.status(400).json({ message: "Yetersiz stok" });

        variant.stock -= it.quantity;
      } 
      // Variant yoksa ana ürün stok
      else {
        if (product.stock < it.quantity)
          return res.status(400).json({ message: "Yetersiz stok" });

        product.stock -= it.quantity;
      }

      await product.save();

      grandTotal += it.quantity * it.unitPrice;
    }

    // ==============================
    // SATIŞ KAYDI (CARİ BORÇ)
    // ==============================
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