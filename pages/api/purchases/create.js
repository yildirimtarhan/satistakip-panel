// /pages/api/purchases/create.js
import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";

import Product from "@/models/Product";
import Cari from "@/models/Cari";
import Transaction from "@/models/Transaction";

const ITEMS_MARKER = "__PURCHASE_ITEMS__:";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteği kabul edilir." });
  }

  try {
    await dbConnect();

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // ✅ AUTH
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Yetki bilgisi eksik" });

    let decoded = null;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded?.userId || decoded?.id || decoded?._id;
    if (!userId) return res.status(401).json({ message: "Yetki bilgisi eksik (userId)" });

    const { accountId, invoiceDate, invoiceNo, orderNo, note, items } = req.body || {};

    if (!accountId) return res.status(400).json({ message: "accountId (cari) zorunlu" });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items boş olamaz" });
    }

    const cari = await Cari.findById(accountId);
    if (!cari) return res.status(404).json({ message: "Cari bulunamadı" });

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
        fxRate: currency === "TRY" ? 1 : fxRate || 1,
        total: Number(lineTotalTRY || 0),
      });
    }

    if (cleanItems.length === 0) {
      return res.status(400).json({ message: "Geçerli alış kalemi yok" });
    }

    // ✅ 1) STOCK ARTIR
    for (const it of cleanItems) {
      await Product.findByIdAndUpdate(it.productId, { $inc: { stock: it.quantity } }, { new: true });
    }

    // ✅ 2) Transaction'a KAYDEDİLEBİLEN alanlar + items'ı note içine göm
// Transaction modelinde items/description/status yok → note içine JSON koyuyoruz.
const humanNote = (note || "Ürün Alışı").toString().trim();
const payload = JSON.stringify(cleanItems);

// ✅ EKLENDİ: Döviz bilgisi bul (items içinden)
const fxItem =
  cleanItems.find((x) => (x.currency || "TRY") !== "TRY") || cleanItems[0];

const currency = fxItem?.currency || "TRY";
const fxRate = Number(fxItem?.fxRate || 1);

// ✅ EKLENDİ: Döviz toplam (FCY)
// TRY ise FCY = TRY toplam mantıklı
const grandTotalFCY =
  currency === "TRY"
    ? Number(grandTotalTRY.toFixed(2))
    : Number(
        cleanItems
          .filter((x) => (x.currency || "TRY") === currency)
          .reduce((s, x) => s + Number(x.totalFCY || 0), 0)
          .toFixed(2)
      );

const tx = await Transaction.create({
  userId,
  accountId,

  type: "purchase",
  direction: "borc",

  amount: Number(grandTotalTRY.toFixed(2)),
  totalTRY: Number(grandTotalTRY.toFixed(2)), // modelde var

  // ✅ EKLENDİ: Döviz alanları (Cari Ekstre ve PDF için şart)
  currency, // USD/EUR/TRY
  fxRate, // kur
  totalFCY: grandTotalFCY, // döviz borç

  date: invoiceDate ? new Date(invoiceDate) : new Date(),

  // invoiceNo/orderNo modelde yok → note içine ekliyoruz
  note:
    `${humanNote}` +
    (invoiceNo ? ` | Fatura: ${invoiceNo}` : "") +
    (orderNo ? ` | Sipariş: ${orderNo}` : "") +
    `\n${ITEMS_MARKER}${payload}`,
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
