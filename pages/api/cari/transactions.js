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

      if (!accountId || !productId || !type || !quantity || !unitPrice || !currency) {
        return res.status(400).json({ message: "⚠️ Eksik bilgi gönderildi." });
      }

      // 🔹 ObjectId dönüşümü
      const accountObjectId = new ObjectId(accountId);
      const productObjectId = new ObjectId(productId);

      // 🔹 Ürün bul
      const product = await products.findOne({ _id: productObjectId });
      if (!product) return res.status(404).json({ message: "Ürün bulunamadı." });

      // 🔹 Cari hesap bul
      const account = await accounts.findOne({ _id: accountObjectId });
      if (!account) return res.status(404).json({ message: "Cari hesap bulunamadı." });

      const total = parseFloat(unitPrice) * parseInt(quantity);

      const newTransaction = {
        accountId: accountObjectId,
        productId: productObjectId,
        type, // "purchase" veya "sale"
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        total,
        currency,
        date: new Date(),
      };

      // 💾 İşlemi kaydet
      await transactions.insertOne(newTransaction);

      // 📦 Stok güncelle
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

      // 💰 Cari bakiye güncelle
      const balanceChange = type === "sale" ? total : -total;
      await accounts.updateOne(
        { _id: accountObjectId },
        { $inc: { balance: balanceChange } }
      );

      return res.status(201).json({
        message: "✅ İşlem başarıyla eklendi",
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
