// 📁 /pages/api/cari/transactions.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const transactions = db.collection("transactions");
    const products = db.collection("products");
    const accounts = db.collection("accounts");
    const stockLogs = db.collection("stock_logs");

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

      const accountObjectId = new ObjectId(accountId);
      const productObjectId = productId ? new ObjectId(productId) : null;

      const account = await accounts.findOne({ _id: accountObjectId });
      if (!account) return res.status(404).json({ message: "Cari bulunamadı" });

      let product = null;
      if (productObjectId) {
        product = await products.findOne({ _id: productObjectId });
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

      await transactions.insertOne(newTransaction);

      // ✅ Ürün stok güncelle
      if (productObjectId) {
        const stockChange = type === "sale" ? -safeQuantity : safeQuantity;

        // === ✅ VARYANT STOCK ===
        if (varyant) {
          const variantIndex = product.varyantlar.findIndex(v => v.ad === varyant);

          if (variantIndex !== -1) {
            product.varyantlar[variantIndex].stok += stockChange;

            await products.updateOne(
              { _id: productObjectId },
              {
                $set: {
                  varyantlar: product.varyantlar,
                  updatedAt: new Date(),
                },
                $inc: { stok: stockChange }, // toplam stok da değişsin
              }
            );
          }
        } 
        else {
          // ✅ varyant yoksa normal stok
          await products.updateOne(
            { _id: productObjectId },
            {
              $inc: { stok: stockChange },
              $set: { updatedAt: new Date() },
            }
          );
        }

        // ✅ Stok log kaydı
        await stockLogs.insertOne({
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
        await products.updateOne(
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

      // ✅ Cari bakiye güncelle
      const balanceChange = type === "sale" ? calculatedTRY : -calculatedTRY;
      await accounts.updateOne(
        { _id: accountObjectId },
        { $inc: { balance: balanceChange } }
      );

      // ✅ Cari toplamları yeniden hesapla
      const allTransactions = await transactions.find({ accountId: accountObjectId }).toArray();

      let totalSalesTRY = 0, totalPurchasesTRY = 0;
      for (const t of allTransactions) {
        const tTRY = Number(
          t.totalTRY ?? (t.currency === "TRY" ? t.total : 0)
        );
        if (t.type === "sale") totalSalesTRY += tTRY;
        else totalPurchasesTRY += tTRY;
      }

      const newBalance = Number((totalSalesTRY - totalPurchasesTRY).toFixed(2));

      await accounts.updateOne(
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
      const list = await transactions.aggregate([
        { $sort: { date: -1 } }
      ]).toArray();

      return res.status(200).json(list);
    }

    return res.status(405).json({ message: "Method not allowed" });

  } catch (err) {
    console.error("🔥 Transaction API hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
