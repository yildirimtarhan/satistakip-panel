// 📁 /pages/api/urunler/stock-logs.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const stockLogs = db.collection("stock_logs");
    const products = db.collection("products");

    if (req.method === "GET") {
      const { productId } = req.query;
      if (!productId) {
        return res.status(400).json({ message: "Ürün ID gerekli." });
      }

      const productObjectId = new ObjectId(productId);

      // 🔍 Logları çek
      const logs = await stockLogs
        .aggregate([
          { $match: { productId: productObjectId } },
          {
            $lookup: {
              from: "accounts",
              localField: "accountId",
              foreignField: "_id",
              as: "account",
            },
          },
          { $sort: { createdAt: -1 } },
        ])
        .toArray();

      const formatted = logs.map((l) => ({
        _id: l._id,
        type: l.type === "sale" ? "Satış" : "Alış",
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.total,
        account: l.account[0]?.ad || "Bilinmiyor",
        source: l.source || "manuel",
        date: l.createdAt,
      }));

      return res.status(200).json(formatted);
    }

    return res.status(405).json({ message: "Yalnızca GET desteklenir." });
  } catch (err) {
    console.error("🔥 Stok log API hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
