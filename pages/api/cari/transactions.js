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

    if (req.method === "POST") {
      const { accountId, productId, type, quantity, unitPrice, currency } = req.body;

      // ⚙️ Ürün seçilmemiş olsa bile işlem kaydedilsin
      if (!accountId || !type || !quantity || !unitPrice || !currency) {
        return res.status(400).json({ message: "⚠️ Eksik bilgi gönderildi." });
      }

      // 🔹 ObjectId dönüşümleri
      const accountObjectId = new ObjectId(accountId);
      const productObjectId = productId ? new ObjectId(productId) : null;

      // 🔹 Cari hesap bul
      const account = await accounts.findOne({ _id: accountObjectId });
      if (!account) return res.status(404).json({ message: "Cari hesap bulunamadı." });

      // 🔹 Ürün varsa kontrol et
      let product = null;
      if (productObjectId) {
        product = await products.findOne({ _id: productObjectId });
        if (!product) return res.status(404).json({ message: "Ürün bulunamadı." });
      }

      const total = parseFloat(unitPrice) * parseInt(quantity);

      const newTransaction = {
        accountId: accountObjectId,
        productId: productObjectId || null,
        type, // "purchase" veya "sale"
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        total,
        currency,
        date: new Date(),
      };

      // 💾 İşlemi kaydet
      await transactions.insertOne(newTransaction);

      // 📦 Stok güncelle (sadece ürün varsa)
      if (productObjectId) {
        if (type === "sale") {
          await products.updateOne(
            { _id: productObjectId },
            { $inc: { stock: -parseInt(quantity) } }
          );
        } else if (type === "purchase") {
          await products.updateOne(
            { _id: productObjectId },
            { $inc: { stock: parseInt(quantity) } }
          );
        }
      }

      // 💰 Cari bakiye güncelle (anlık fark ekle)
      const balanceChange = type === "sale" ? total : -total;
      await accounts.updateOne(
        { _id: accountObjectId },
        { $inc: { balance: balanceChange } }
      );

      // 🧮 [YENİ ÖZELLİK] - Tüm işlemler üzerinden cari bakiyeyi senkronize et
      try {
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

        console.log(
          `🔁 Cari bakiye güncellendi (${account.name}): Satış=${totalSales}, Alış=${totalPurchases}, Bakiye=${newBalance}`
        );
      } catch (calcErr) {
        console.error("🧮 Bakiye senkronizasyon hatası:", calcErr);
      }

      return res.status(201).json({
        message: "✅ İşlem başarıyla eklendi ve bakiye senkronize edildi",
        transaction: newTransaction,
      });
    }

    if (req.method === "GET") {
      const list = await transactions
        .aggregate([
          {
            $lookup: {
              from: "accounts",
              localField: "accountId",
              foreignField: "_id",
              as: "account",
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "productId",
              foreignField: "_id",
              as: "product",
            },
          },
          { $sort: { date: -1 } },
        ])
        .toArray();

      // Veriyi okunabilir hale getir
      const formatted = list.map((t) => ({
        _id: t._id,
        account: t.account[0]?.name || "Bilinmiyor",
        product: t.product[0]?.name || "Bilinmiyor",
        type: t.type,
        quantity: t.quantity,
        total: t.total,
        currency: t.currency,
        date: t.date,
      }));

      return res.status(200).json(formatted);
    }

    return res
      .status(405)
      .json({ message: "❌ Yalnızca GET ve POST metodları desteklenir." });
  } catch (err) {
    console.error("🔥 Transaction API hatası:", err);
    return res.status(500).json({
      message: "Sunucu hatası oluştu.",
      error: err.message,
    });
  }
}
