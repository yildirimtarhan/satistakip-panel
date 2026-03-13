// 📁 /pages/api/cari/transactions.js  ✅ SATIŞ CREATE FINAL
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import Cari from "@/models/Cari";
import StockLog from "@/models/StockLog";
import { pushStockToMarketplaces } from "@/lib/pazaryeriStockSync";
import Counter from "@/models/Counter"; // ✅ sende var (next-sale-no.js bunu kullanıyor)

function pad(n, w = 6) {
  const s = String(n);
  return s.length >= w ? s : "0".repeat(w - s.length) + s;
}

async function getNextSaleNo({ session, companyId }) {
  const year = new Date().getFullYear();

  // ✅ next-sale-no.js ile aynı mantık: { key:"saleNo", companyId, year } + seq++
  const counter = await Counter.findOneAndUpdate(
    { key: "saleNo", companyId, year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );

  return `SAT-${year}-${pad(counter.seq)}`;
}

export default async function handler(req, res) {
  res.setHeader("Allow", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  await dbConnect();

  // 🔐 Token
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : auth.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token gerekli" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Geçersiz token" });
  }

  const isAdmin = decoded.role === "admin";
  const ownerUserId =
    isAdmin && req.body?.userId ? String(req.body.userId) : String(decoded.userId);

  const companyId = String(decoded.companyId || ownerUserId);

  try {
    // =========================================================
    // ✅ GET — Liste / Ekstre (Admin tümünü görebilir)
    // =========================================================
    if (req.method === "GET") {
      const filter = isAdmin ? {} : { userId: ownerUserId };
      const list = await Transaction.find(filter).sort({ date: -1 }).lean();
      return res.status(200).json(list);
    }

    // =========================================================
    // ✅ POST — SATIŞ CREATE (Tek ürün + Sepet destekli)
    // =========================================================
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const {
      // eski body (tek ürün) — geriye dönük destek
      saleNo: saleNoFromClient,
      accountId,
      productId,
      quantity,
      unitPrice,

      // yeni body (sepet)
      items,

      // ortak
      currency = "TRY",
      fxRate = 1,
      date,
      note,
    } = req.body || {};

    if (!accountId) return res.status(400).json({ message: "accountId gerekli" });

    // ================= PURCHASE (ÜRÜN ALIŞ) =================
    // Frontend /dashboard/urun-alis.js şu payload ile gelir:
    // { type:"purchase", purchaseNo, supplierId, invoiceNo, orderNo, date, note, rates:{USD,EUR}, lines:[{productId,adet,fiyat,currency,kdv,barcode,name}] }
    if ((req.body?.type || "").toLowerCase() === "purchase") {
      const {
        purchaseNo = "",
        supplierId,
        invoiceNo = "",
        orderNo = "",
        rates = {},
        lines = [],
      } = req.body || {};

      const accountIdForPurchase = supplierId || accountId;
      if (!accountIdForPurchase) {
        return res.status(400).json({ message: "supplierId/accountId gerekli" });
      }
      if (!Array.isArray(lines) || !lines.length) {
        return res.status(400).json({ message: "lines boş olamaz" });
      }

      // Kur normalize
      const usd = Number(rates?.USD?.rateSell ?? rates?.USD ?? 0);
      const eur = Number(rates?.EUR?.rateSell ?? rates?.EUR ?? 0);

      const effectiveRate = (cur) => {
        if (cur === "TRY") return 1;
        if (cur === "USD") return usd || 1;
        if (cur === "EUR") return eur || 1;
        return 1;
      };

      // Cari (tedarikçi) doğrula (multi-tenant)
      const cari = await Cari.findOne({ _id: accountIdForPurchase, companyId }).lean();
      if (!cari) return res.status(404).json({ message: "Cari bulunamadı" });

      let totalTRY = 0;

      // Ürün stok artır + stok log
      for (const r of lines) {
        const pid = r.productId || r._id;
        const qty = Number(r.adet ?? r.quantity ?? r.qty ?? 1);
        const price = Number(r.fiyat ?? r.unitPrice ?? 0);
        const cur = String(r.currency || "TRY");
        const kdv = Number(r.kdv ?? 0);

        if (!pid || qty <= 0) continue;

        const fx = effectiveRate(cur);
        const base = qty * price;
        const withKdv = base + (base * kdv) / 100;
        const lineTRY = cur === "TRY" ? withKdv : Number((withKdv * fx).toFixed(2));
        totalTRY += lineTRY;

        // stok artır
        await Product.updateOne(
          { _id: pid, companyId },
          { $inc: { stock: qty }, $set: { updatedAt: new Date() } }
        );

        await StockLog.create({
          type: "IN",
          reason: "purchase",
          productId: pid,
          barcode: r.barcode || "",
          name: r.name || "",
          quantity: qty,
          unitPrice: price,
          currency: cur,
          fxRate: fx,
          amountTRY: lineTRY,
          date: date ? new Date(date) : new Date(),
          note: note || invoiceNo || orderNo || "",
          userId,
          companyId,
        });
      }

      // Cari bakiye güncelle (alış = BORÇ)
      await Cari.updateOne(
        { _id: accountIdForPurchase, companyId },
        {
          $inc: { bakiye: totalTRY, totalPurchases: totalTRY },
          $set: { updatedAt: new Date() },
        }
      );

      // Ekstreye transaction yaz (note'da items saklanır — iptal için gerekli)
      const ITEMS_MARKER = "__PURCHASE_ITEMS__:";
      const purchaseItems = lines
        .filter((r) => r.productId || r._id)
        .map((r) => {
          const pid = r.productId || r._id;
          const qty = Number(r.adet ?? r.quantity ?? r.qty ?? 1);
          const price = Number(r.fiyat ?? r.unitPrice ?? 0);
          const cur = String(r.currency || "TRY");
          const kdv = Number(r.kdv ?? 0);
          const fx = effectiveRate(cur);
          const base = qty * price;
          const withKdv = base + (base * kdv) / 100;
          const lineTRY = cur === "TRY" ? withKdv : Number((withKdv * fx).toFixed(2));
          return {
            productId: String(pid),
            quantity: qty,
            unitPrice: price,
            currency: cur,
            fxRate: fx,
            total: lineTRY,
          };
        });
      const humanNote = `Ürün Alış${purchaseNo ? " #" + purchaseNo : ""}${invoiceNo ? " | Fatura: " + invoiceNo : ""}${orderNo ? " | Sipariş: " + orderNo : ""}${note ? " | " + note : ""}`;
      await Transaction.create({
        accountId: accountIdForPurchase,
        type: "purchase",
        amount: Number(totalTRY.toFixed(2)),
        totalTRY: Number(totalTRY.toFixed(2)),
        currency: "TRY",
        date: date ? new Date(date) : new Date(),
        note: `${humanNote}\n${ITEMS_MARKER}${JSON.stringify(purchaseItems)}`,
        userId,
        companyId,
      });

      const purchaseProductIds = lines.filter((r) => r.productId || r._id).map((r) => r.productId || r._id);
      if (purchaseProductIds.length) {
        pushStockToMarketplaces(purchaseProductIds, { companyId, userId: ownerUserId });
      }

      return res.status(200).json({
        success: true,
        message: "Ürün alış kaydedildi",
        totalTRY: Number(totalTRY.toFixed(2)),
      });
    }


    // ✅ Sepet normalize
    let normalizedItems = [];

    // yeni format: items[]
    if (Array.isArray(items) && items.length) {
      normalizedItems = items.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity ?? it.qty ?? 1),
        unitPrice: Number(it.unitPrice ?? 0),
      }));
    } else {
      // eski format: tek ürün
      if (!productId) return res.status(400).json({ message: "productId gerekli" });
      normalizedItems = [
        {
          productId,
          quantity: Number(quantity ?? 1),
          unitPrice: Number(unitPrice ?? 0),
        },
      ];
    }

    // basit doğrulama
    for (const it of normalizedItems) {
      if (!it.productId) return res.status(400).json({ message: "Sepette ürün eksik" });
      if (!Number.isFinite(it.quantity) || it.quantity <= 0)
        return res.status(400).json({ message: "quantity geçersiz" });
      if (!Number.isFinite(it.unitPrice) || it.unitPrice < 0)
        return res.status(400).json({ message: "unitPrice geçersiz" });
    }

    // ✅ cari kontrol (multi-tenant)
    const cari = await Cari.findOne({ _id: accountId, userId: ownerUserId });
    if (!cari) return res.status(404).json({ message: "Cari bulunamadı" });

    // ✅ Transaction (atomic)
    const session = await mongoose.startSession();

    let finalSaleNo = "";
    let grandTotalTRY = 0;

    try {
      await session.withTransaction(async () => {
        // 1) SaleNo: client göndermişse kullan (geriye dönük),
        // yoksa counter’dan üret (önerilen)
        finalSaleNo =
          saleNoFromClient && String(saleNoFromClient).trim()
            ? String(saleNoFromClient).trim()
            : await getNextSaleNo({ session, companyId });

        // 2) Her satır için: stok kontrol + stok düş + Transaction + StockLog
        for (const it of normalizedItems) {
          const qty = Number(it.quantity);
          const price = Number(it.unitPrice);
          const total = qty * price;
          const lineTRY =
            currency === "TRY" ? total : Number((total * Number(fxRate || 1)).toFixed(2));

          // ✅ stok düşümü: Product.stock (senin modelin)
          // Negatif stok olmasın: stock >= qty şartı
          const updated = await Product.findOneAndUpdate(
            { _id: it.productId, userId: ownerUserId, stock: { $gte: qty } },
            { $inc: { stock: -qty } },
            { new: true, session }
          );

          if (!updated) {
            throw new Error("Yetersiz stok (stok düşümü başarısız)");
          }

          // 🧾 Transaction
          await Transaction.create(
            [
              {
                userId: ownerUserId,     // ✅ multi-tenant
                saleNo: finalSaleNo,     // ✅ satış fişi/gruplama
                accountId,
                productId: it.productId,
                type: "sale",
                quantity: qty,
                unitPrice: price,
                total,
                currency,
                fxRate,
                totalTRY: lineTRY,
                varyant: "",
                date: date ? new Date(date) : new Date(),
                note: note || "",
              },
            ],
            { session }
          );

          // 📊 StockLog
          await StockLog.create(
            [
              {
                userId: ownerUserId,
                productId: it.productId,
                accountId,
                type: "sale",
                quantity: qty,
                unitPrice: price,
                total,
                currency,
                fxRate,
                totalTRY: lineTRY,
                source: "erp",
                createdAt: new Date(),
              },
            ],
            { session }
          );

          grandTotalTRY += Number(lineTRY || 0);
        }

        // 3) Cari bakiye (cache) — transaction ile atomik
        await Cari.updateOne(
          { _id: accountId, userId: ownerUserId },
          {
            $inc: {
              bakiye: Number(grandTotalTRY.toFixed(2)),
              totalSales: Number(grandTotalTRY.toFixed(2)),
            },
            $set: { updatedAt: new Date() },
          },
          { session }
        );
      });

      // Ortak stok → pazaryerlerine anlık push
      const affectedIds = normalizedItems.map((it) => it.productId).filter(Boolean);
      if (affectedIds.length) {
        pushStockToMarketplaces(affectedIds, { companyId, userId: ownerUserId });
      }

      return res.status(201).json({
        success: true,
        message: "Satış kaydedildi",
        saleNo: finalSaleNo,
        totalTRY: Number(grandTotalTRY.toFixed(2)),
      });
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("transactions error:", err);
    return res.status(500).json({ message: err.message || "Sunucu hatası" });
  }
}