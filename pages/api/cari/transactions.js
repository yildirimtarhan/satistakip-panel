// 📁 /pages/api/cari/transactions.js
import dbConnect from "@/lib/mongodb";
import { Types } from "mongoose";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import Cari from "@/models/Cari";
import StockLog from "@/models/StockLog";

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method === "POST") {
      const { 
        accountId, productId, type, quantity, unitPrice, currency, fxRate, totalTRY, varyant 
      } = req.body;

      const safeCurrency = currency || "TRY";
      const safeQuantity = parseFloat(quantity) || 1;
      const safeUnitPrice = parseFloat(unitPrice) || 0;
      const safeFxRate = safeCurrency === "TRY" ? 1 : Number(fxRate) || 0;

      if (!accountId || !type) {
        return res.status(400).json({ message: "⚠️ Eksik bilgi (accountId/type)" });
      }

      const accountObjectId = new Types.ObjectId(accountId);
      const productObjectId = productId ? new Types.ObjectId(productId) : null;

      const account = await Cari.findById(accountObjectId);
      if (!account) return res.status(404).json({ message: "Cari bulunamadı" });

      let product = null;
      if (productObjectId) {
        product = await Product.findById(productObjectId);
        if (!product) return res.status(404).json({ message: "Ürün bulunamadı" });
      }

      // ✅ TL Toplam Hesap
      const total = safeUnitPrice * safeQuantity;
      const calculatedTRY = 
        safeCurrency === "TRY"
        ? total
        : totalTRY
        ? Number(totalTRY)
        : Number((total * safeFxRate).toFixed(2));

      // ✅ İşlem kaydı
      const newTransaction = {
        accountId: accountObjectId,
        productId: productObjectId,
        type,
        quantity: safeQuantity,
        unitPrice: safeUnitPrice,
        total,
        currency: safeCurrency,
        fxRate: safeFxRate,
        totalTRY: calculatedTRY,
        varyant: varyant || null,
        date: new Date(),
      };

      await Transaction.create(newTransaction);

      // ✅ Ürün stok güncelle
      if (productObjectId) {
        const stockChange = type === "sale" ? -safeQuantity : safeQuantity;

        // === ✅ VARYANT STOCK ===
        if (varyant && product.varyantlar?.length) {
          const variantIndex = product.varyantlar.findIndex(v => v.ad === varyant);

          if (variantIndex !== -1) {
            product.varyantlar[variantIndex].stok += stockChange;

            await Product.updateOne(
              { _id: productObjectId },
              {
                $set: {
                  varyantlar: product.varyantlar,
                  updatedAt: new Date(),
                },
                $inc: { stok: stockChange },
              }
            );
          }
        } 
        else {
          await Product.updateOne(
            { _id: productObjectId },
            {
              $inc: { stok: stockChange },
              $set: { updatedAt: new Date() },
            }
          );
        }

        // ✅ Stok log
        await StockLog.create({
          productId: productObjectId,
          accountId: accountObjectId,
          type,
          varyant: varyant || null,
          quantity: safeQuantity,
          unitPrice: safeUnitPrice,
          total,
          currency: safeCurrency,
          fxRate: safeFxRate,
          totalTRY: calculatedTRY,
          createdAt: new Date(),
        });
      }

      // ✅ Alış ise alış fiyatını güncelle
      if (type === "purchase" && productObjectId) {
        await Product.updateOne(
          { _id: productObjectId },
          {
            $set: {
              alisFiyati: safeUnitPrice,
              paraBirimi: safeCurrency,
              updatedAt: new Date(),
            }
          }
        );
      }

      // =============================
      // 🔄 Cari bakiye ve toplamlar
      // =============================
      const balanceChange = type === "sale" ? calculatedTRY : -calculatedTRY;
      await Cari.updateOne(
        { _id: accountObjectId },
        { $inc: { balance: balanceChange } }
      );

      const allTransactions = await Transaction.find({ accountId: accountObjectId });

      let totalSalesTRY = 0, totalPurchasesTRY = 0;
      for (const t of allTransactions) {
        const tTRY = Number(
          t.totalTRY ?? (t.currency === "TRY" ? t.total : 0)
        );
        if (t.type === "sale") totalSalesTRY += tTRY;
        else totalPurchasesTRY += tTRY;
      }

      const newBalance = Number((totalSalesTRY - totalPurchasesTRY).toFixed(2));

      await Cari.updateOne(
        { _id: accountObjectId },
        {
          $set: {
            balance: newBalance,
            totalSales: totalSalesTRY,
            totalPurchases: totalPurchasesTRY,
            updatedAt: new Date(),
          },
        }
      );

      return res.status(201).json({
        message: "✅ İşlem kaydedildi • varyant stok güncellendi",
        transaction: newTransaction
      });
    }

    // 📥 GET
    if (req.method === "GET") {
      const list = await Transaction.find().sort({ date: -1 });
      return res.status(200).json(list);
    }

    return res.status(405).json({ message: "Method not allowed" });

  } catch (err) {
    console.error("🔥 Transaction API hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
