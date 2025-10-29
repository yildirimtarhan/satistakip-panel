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

      // 🧩 Varsayılan değerleri uygula
      const safeCurrency = currency || "TRY";
      const safeQuantity = parseInt(quantity) || 1;
      const safeUnitPrice = parseFloat(unitPrice) || 0;

      // ⚙️ Zorunlu alan kontrolü
      if (!accountId || !type) {
        return res.status(400).json({ message: "⚠️ Eksik bilgi gönderildi (accountId/type)." });
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

      const total = safeUnitPrice * safeQuantity;

      const newTransaction = {
        accountId: accountObjectId,
        productId: productObjectId || null,
        type, // "purchase" veya "sale"
        quantity: safeQuantity,
        unitPrice: safeUnitPrice,
        total,
        currency: safeCurrency,
        date: new Date(),
      };

      // 💾 İşlemi kaydet
      await transactions.insertOne(newTransaction);

      // 📦 Stok güncelle (sadece ürün varsa)
      if (productObjectId) {
        await products.updateOne(
          { _id: productObjectId },
          { $inc: { stock: type === "sale" ? -safeQuantity : safeQuantity } }
        );
      }

      // 💰 Cari bakiye güncelle (anlık fark ekle)
      const balanceChange = type === "sale" ? total : -total;
      await accounts.updateOne(
        { _id: accountObjectId },
        { $inc: { balance: balanceChange } }
      );

      // 🧮 Tüm işlemler üzerinden cari bakiyeyi senkronize et
      const allTransactions = await transactions.find({ accountId: accountObjectId }).toArray();

      let totalSales = 0;
      let totalPurchases = 0;

      for (const t of allTransactions) {
        if (t.type === "sale") totalSales += t.total;
        else if (t.type === "purchase") totalPurchases += t.total;
      }

      const newBalance = totalSales - totalPurchases;

      // 🔁 Cari kaydı güncelle ve yeni bilgileri al
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
        `🔁 Cari bakiye güncellendi (${account.ad || account.name || "Bilinmiyor"}): Satış=${totalSales}, Alış=${totalPurchases}, Bakiye=${newBalance}`
      );

      return res.status(201).json({
        message: "✅ İşlem başarıyla eklendi ve bakiye senkronize edildi",
        transaction: newTransaction,
        updatedAccount, // 🔹 Yeni eklendi: güncel cari bilgisi döndürülüyor
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
        account: t.account[0]?.ad || "Bilinmiyor",
        product: t.product[0]?.ad || "Bilinmiyor",
        type: t.type,
        quantity: t.quantity,
        unitPrice: t.unitPrice || 0,
        total: t.total,
        currency: t.currency,
        date: t.date,
      }));

      return res.status(200).json(formatted);
    }

    // ❌ Desteklenmeyen metod
    return res.status(405).json({ message: "❌ Yalnızca GET ve POST metodları desteklenir." });
  } catch (err) {
    console.error("🔥 Transaction API hatası:", err);
    return res.status(500).json({
      message: "Sunucu hatası oluştu.",
      error: err.message,
    });
  }
}
