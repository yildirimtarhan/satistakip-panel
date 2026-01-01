// /pages/api/purchases/create.js
import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";

import Product from "@/models/Product";
import Cari from "@/models/Cari";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteği kabul edilir." });
  }

  try {
    await dbConnect();

    // ✅ AUTH
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Yetki bilgisi eksik" });
    }

    let decoded = null;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // ✅ Token payload farklı projelerde farklı geliyor olabilir
    const userId = decoded?.userId || decoded?.id || decoded?._id;
    const role = decoded?.role || "user";

    if (!userId) {
      return res.status(401).json({ message: "Yetki bilgisi eksik (userId)" });
    }

    // İstersen admin alış yapamasın:
    // if (role === "admin") {
    //   return res.status(403).json({ message: "Admin alış işlemi yapamaz." });
    // }

    const {
      accountId, // cariId
      invoiceDate,
      invoiceNo,
      orderNo,
      note,
      items,
    } = req.body || {};

    if (!accountId) {
      return res.status(400).json({ message: "accountId (cari) zorunlu" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items boş olamaz" });
    }

    // ✅ Cari var mı?
    const cari = await Cari.findById(accountId);
    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    // ✅ Items doğrula + toplamı hesapla
    const cleanItems = [];
    let grandTotalTRY = 0;

    for (const it of items) {
      const productId = it?.productId;
      const quantity = Number(it?.quantity || 0);
      const unitPrice = Number(it?.unitPrice || 0);
      const currency = it?.currency || "TRY";
      const fxRate = Number(it?.fxRate || 1);

      if (!productId) continue;
      if (!quantity || quantity <= 0) continue;

      // TRY toplam: adet * fiyat * kur
      const lineTotalTRY =
        Number(it?.total) && Number(it?.total) > 0
          ? Number(it?.total)
          : quantity * unitPrice * (currency === "TRY" ? 1 : fxRate || 1);

      grandTotalTRY += Number(lineTotalTRY || 0);

      cleanItems.push({
        productId,
        quantity,
        unitPrice,
        currency,
        fxRate: currency === "TRY" ? 1 : (fxRate || 1),
        total: Number(lineTotalTRY || 0),
      });
    }

    if (cleanItems.length === 0) {
      return res.status(400).json({ message: "Geçerli alış kalemi yok" });
    }

    // ✅ 1) STOCK ARTIR (Product.stock)
    // Not: Product modelinde "stock" alanı var. (stok değil)
    for (const it of cleanItems) {
      await Product.findByIdAndUpdate(
        it.productId,
        { $inc: { stock: it.quantity } },
        { new: true }
      );
    }

    // ✅ 2) TRANSACTION OLUŞTUR (Cari Ekstre / Borç)
    // Purchase = borçlandırır.
    const tx = await Transaction.create({
  userId,
  accountId,

  type: "purchase",

  // 🔥 DOĞRU ENUM
  direction: "borc",

  amount: Number(grandTotalTRY.toFixed(2)),
  description: note || "Ürün Alışı",

  invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
  invoiceNo: invoiceNo || "",
  orderNo: orderNo || "",

  items: cleanItems,
  status: "completed",
});


    return res.status(200).json({
      message: "✅ Alış kaydı oluşturuldu",
      purchase: {
        _id: tx._id,
        accountId,
        totalTry: Number(grandTotalTRY.toFixed(2)),
        items: cleanItems,
      },
    });
  } catch (err) {
    console.error("PURCHASE CREATE ERROR:", err);
    return res.status(500).json({
      message: "Alış kaydı oluşturulamadı",
      error: err?.message || String(err),
    });
  }
}
