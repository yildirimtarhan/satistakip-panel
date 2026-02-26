import dbConnect from "@/lib/dbConnect";
import { verifyApiKey } from "@/lib/verifyApiKey";
import Product from "@/models/Product";
import Cari from "@/models/Cari";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Sadece POST" });

  try {
    const keyDoc = await verifyApiKey(req);
    await dbConnect();

    const {
      ad,
      soyad,
      email,
      phone,
      adres,
      productCode,
      quantity,
      price,
      note,
    } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email zorunlu" });

    const fullName = `${ad || ""} ${soyad || ""}`.trim();

    // =========================
    // 1️⃣ CARİ BUL / OLUŞTUR
    // =========================

    let cari = await Cari.findOne({
      companyId: keyDoc.companyId,
      $or: [
        { email: email || "" },
        ...(phone ? [{ telefon: phone }] : []),
      ],
    });

    if (!cari) {
      cari = await Cari.create({
        companyId: keyDoc.companyId,
        ad: fullName || "Web Müşteri",
        email: email || "",
        telefon: phone || "",
        adres: adres || "",
        tur: "Müşteri",
      });
    } else {
      if (!cari.ad || cari.ad.trim() === "") {
        cari.ad = fullName || cari.ad;
      }

      if (!cari.telefon && phone) cari.telefon = phone;
      if (!cari.adres && adres) cari.adres = adres;

      await cari.save();
    }

    // =========================
    // 2️⃣ SADECE CARİ OLUŞTURMA
    // =========================

    if (!quantity || Number(quantity) === 0) {
      return res.status(200).json({
        success: true,
        message: "Sadece cari oluşturuldu",
        cariId: cari._id,
      });
    }

    // =========================
    // 3️⃣ ÜRÜN BUL (SKU / Barkod / Model Adı)
    // =========================

    if (!productCode)
      return res.status(400).json({ message: "Ürün kodu zorunlu" });

    const product = await Product.findOne({
      companyId: keyDoc.companyId,
      $or: [
        { sku: productCode },
        { barcode: productCode },
        { name: productCode },
      ],
    });

    if (!product)
      return res.status(404).json({ message: "Ürün bulunamadı" });

    if (product.stock < quantity)
      return res.status(400).json({ message: "Yetersiz stok" });

    // =========================
    // 4️⃣ STOK DÜŞ
    // =========================

    product.stock -= Number(quantity);
    await product.save();

    // =========================
    // 5️⃣ TRANSACTION OLUŞTUR
    // =========================

    const total = Number(price) * Number(quantity);

    const transaction = await Transaction.create({
      companyId: keyDoc.companyId,
      userId: null, // entegrasyon işlemi

      accountId: cari._id,
      accountName: cari.ad,

      items: [
        {
          productId: product._id,
          name: product.name,
          barcode: product.barcode,
          sku: product.sku,
          quantity: Number(quantity),
          unitPrice: Number(price),
          vatRate: 0,
          total,
        },
      ],

      direction: "borc",
      amount: total,
      paymentMethod: "entegrasyon",
      note: note || "Web sitesi satışı",

      type: "sale",
      currency: "TRY",
      fxRate: 1,
      totalTRY: total,
      totalFCY: total,
    });

    return res.status(200).json({
      success: true,
      message: "Satış başarıyla oluşturuldu",
      transactionId: transaction._id,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}