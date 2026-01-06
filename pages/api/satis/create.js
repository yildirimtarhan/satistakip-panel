// pages/api/satis/create.js
import dbConnect from "@/lib/mongodb";
import verifyToken from "@/lib/verifyToken";

import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import Transaction from "@/models/Transaction";

function safeNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteği kabul edilir." });
  }

  try {
    await dbConnect();

    const user = await verifyToken(req);
    const userId = user?.userId || user?.id;
    if (!userId) return res.status(401).json({ message: "Yetkisiz" });

    const body = req.body || {};

    const accountId = body.accountId || body.cariId;
    const saleDate = body.date || body.saleDate || new Date().toISOString().slice(0, 10);
    const currency = body.currency || "TRY";
    const fxRate = safeNum(body.fxRate, 1);

    const paymentType = body.paymentType || body.odemeTipi || "acik";
    const partialPaymentTRY = safeNum(body.partialPaymentTRY ?? body.partialPayment ?? 0, 0);

    const note = body.note || body.not || "";
    const saleNo = body.saleNo || body.satisNo || "";

    const itemsRaw = body.items || body.lines || body.cart || [];
    const items = Array.isArray(itemsRaw) ? itemsRaw : [];

    if (!accountId) return res.status(400).json({ message: "accountId gerekli" });
    if (!items.length) return res.status(400).json({ message: "Sepette ürün yok" });

    // ---- Toplamlar ----
    let subTotalTRY = 0;
    let vatTotalTRY = 0;
    let grandTotalTRY = 0;

    const normalizedItems = items.map((it) => {
      const productId = it.productId || it._id || it.id;
      const quantity = safeNum(it.quantity ?? it.qty ?? it.adet, 1);
      const unitPrice = safeNum(it.unitPrice ?? it.price ?? it.birimFiyat ?? it.satisFiyati, 0);
      const vatRate = safeNum(it.vatRate ?? it.kdv, 20);

      const lineSub = unitPrice * quantity;
      const lineVat = (lineSub * vatRate) / 100;
      const lineTotal = lineSub + lineVat;

      // TRY hesabı
      const lineTotalTRY = currency === "TRY" ? lineTotal : lineTotal * fxRate;
      const lineSubTRY = currency === "TRY" ? lineSub : lineSub * fxRate;
      const lineVatTRY = currency === "TRY" ? lineVat : lineVat * fxRate;

      subTotalTRY += lineSubTRY;
      vatTotalTRY += lineVatTRY;
      grandTotalTRY += lineTotalTRY;

      return {
        productId,
        name: it.name || it.ad || "",
        barcode: it.barcode || it.barkod || "",
        sku: it.sku || it.stokKodu || "",
        quantity,
        unitPrice,
        vatRate,
        lineSub,
        lineVat,
        lineTotal,
        currency,
        fxRate,
        lineTotalTRY,
        lineSubTRY,
        lineVatTRY,
        varyant: it.varyant || "",
      };
    });

    // ---- Stok düş + stok log ----
    for (const it of normalizedItems) {
      if (!it.productId) {
        return res.status(400).json({ message: "productId gerekli" });
      }

      const p = await Product.findOne({ _id: it.productId, userId });
      if (!p) return res.status(404).json({ message: "Ürün bulunamadı" });

      const currentStock = safeNum(p.stock ?? p.stok, 0);
      if (currentStock < it.quantity) {
        return res.status(400).json({
          message: `Stok yetersiz: ${p.name || p.ad || "Ürün"} (stok: ${currentStock})`,
        });
      }

      p.stock = currentStock - it.quantity;
      await p.save();

      // StockLog varsa yaz
      try {
        await StockLog.create({
          userId,
          productId: p._id,
          delta: -it.quantity,
          reason: "sale",
          note: saleNo ? `Satış: ${saleNo}` : "Satış",
          createdAt: new Date(),
        });
      } catch (e) {
        // StockLog modeli projede farklı olabilir → satışın kendisini bozmayalım
      }
    }

    // ---- Transaction kaydı (ekstreyi besler) ----
    // NOT: Transaction şeman projede geniş; fazla alanlar strict mode’da yok sayılır, hata çıkarmaz.
    // Bu yüzden olabildiğince alan gönderiyoruz.
    const createdTx = [];
    for (const it of normalizedItems) {
      const tx = await Transaction.create({
        userId,
        createdBy: userId,
        accountId,
        type: "sale",
        direction: "borc",
        // kalem bazlı
        productId: it.productId,
        productName: it.name,
        barcode: it.barcode,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.lineTotal,
        currency: it.currency,
        fxRate: it.fxRate,
        totalTRY: it.lineTotalTRY,
        amount: it.lineTotalTRY,
        varyant: it.varyant,
        // üst bilgi
        saleNo,
        saleDate,
        note,
        source: "system",
      });

      createdTx.push(tx);
    }

    // ---- Kısmi tahsilat (opsiyonel) ----
    if (partialPaymentTRY > 0) {
      await Transaction.create({
        userId,
        createdBy: userId,
        accountId,
        type: "payment",
        direction: "alacak",
        amount: partialPaymentTRY,
        currency: "TRY",
        fxRate: 1,
        totalTRY: partialPaymentTRY,
        saleNo,
        saleDate,
        note: note ? `Kısmi tahsilat: ${note}` : "Kısmi tahsilat",
        source: "system",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Satış kaydedildi",
      saleNo,
      saleDate,
      totals: {
        subTotalTRY: Math.round(subTotalTRY * 100) / 100,
        vatTotalTRY: Math.round(vatTotalTRY * 100) / 100,
        grandTotalTRY: Math.round(grandTotalTRY * 100) / 100,
        partialPaymentTRY,
      },
      transactionCount: createdTx.length + (partialPaymentTRY > 0 ? 1 : 0),
    });
  } catch (err) {
    console.error("SATIS CREATE ERROR:", err);
    return res.status(500).json({ message: "Satış kaydedilemedi", error: err?.message || String(err) });
  }
}
