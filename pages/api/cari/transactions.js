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
    const stockLogs = db.collection("stock_logs"); // 📦 stok hareket logları

    // ======================
    // 📤 POST - Yeni işlem ekle
    // ======================
    if (req.method === "POST") {
      const { accountId, productId, type, quantity, unitPrice, currency } = req.body;

      const safeCurrency = currency || "TRY";
      const safeQuantity = parseInt(quantity) || 1;
      const safeUnitPrice = parseFloat(unitPrice) || 0;

      if (!accountId || !type) {
        return res.status(400).json({ message: "⚠️ Eksik bilgi gönderildi (accountId/type)." });
      }

      const accountObjectId = new ObjectId(accountId);
      const productObjectId = productId ? new ObjectId(productId) : null;

      const account = await accounts.findOne({ _id: accountObjectId });
      if (!account) return res.status(404).json({ message: "Cari hesap bulunamadı." });

      let product = null;
      if (productObjectId) {
        product = await products.findOne({ _id: productObjectId });
        if (!product) return res.status(404).json({ message: "Ürün bulunamadı." });
      }

      const total = safeUnitPrice * safeQuantity;

      const newTransaction = {
        accountId: accountObjectId,
        productId: productObjectId || null,
        type,
        quantity: safeQuantity,
        unitPrice: safeUnitPrice,
        total,
        currency: safeCurrency,
        date: new Date(),
      };

      await transactions.insertOne(newTransaction);

      // 📦 Stok + Log
      if (productObjectId) {
        const stockChange = type === "sale" ? -safeQuantity : safeQuantity;

        await products.updateOne(
          { _id: productObjectId },
          {
            $inc: { stock: stockChange },
            $set: {
              updatedAt: new Date(),
              lastTransactionType: type,
              lastTransactionQty: safeQuantity,
              lastTransactionDate: new Date(),
            },
          }
        );

        await stockLogs.insertOne({
          productId: productObjectId,
          accountId: accountObjectId,
          type,
          quantity: safeQuantity,
          unitPrice: safeUnitPrice,
          total,
          currency: safeCurrency,
          source: "manual",
          createdAt: new Date(),
        });
      }

      // 🆕 **Alış işleminde ürünün alış fiyatını otomatik güncelle**
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

      // 💰 Cari bakiye güncelle
      const balanceChange = type === "sale" ? total : -total;
      await accounts.updateOne(
        { _id: accountObjectId },
        { $inc: { balance: balanceChange } }
      );

      // 🧮 Tüm işlemleri oku ve bakiyeyi yeniden hesapla
      const allTransactions = await transactions.find({ accountId: accountObjectId }).toArray();

      let totalSales = 0;
      let totalPurchases = 0;

      for (const t of allTransactions) {
        if (t.type === "sale") totalSales += t.total;
        else if (t.type === "purchase") totalPurchases += t.total;
      }

      const newBalance = totalSales - totalPurchases;

      await accounts.updateOne(
        { _id: accountObjectId },
        {
          $set: {
            balance: newBalance,
            totalSales,
            totalPurchases,
            updatedAt: new Date(),
          },
        }
      );

      const updatedAccount = await accounts.findOne({ _id: accountObjectId });

      console.log(
        `🔁 Cari güncellendi (${account.ad}): Bakiye=${newBalance}, Satış=${totalSales}, Alış=${totalPurchases}`
      );

      return res.status(201).json({
        message: "✅ İşlem eklendi — stok & bakiye güncellendi — alış fiyatı senkronize edildi",
        transaction: newTransaction,
        updatedAccount,
      });
    }

    // ======================
    // 📥 GET - İşlem listesi
    // ======================
    if (req.method === "GET") {
      const list = await transactions
        .aggregate([
          { $lookup: { from: "accounts", localField: "accountId", foreignField: "_id", as: "account" }},
          { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" }},
          { $sort: { date: -1 } },
        ])
        .toArray();

      return res.status(200).json(
        list.map((t) => ({
          _id: t._id,
          account: t.account[0]?.ad || "Bilinmiyor",
          product: t.product[0]?.ad || "Bilinmiyor",
          type: t.type === "sale" ? "Satış" : "Alış",
          quantity: t.quantity,
          unitPrice: t.unitPrice,
          total: t.total,
          currency: t.currency,
          date: t.date,
        }))
      );
    }

    return res.status(405).json({ message: "❌ Yalnızca GET & POST desteklenir." });

  } catch (err) {
    console.error("🔥 Transaction API hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
