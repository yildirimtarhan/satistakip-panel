// 📁 /pages/api/stock/logs.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token eksik" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = await clientPromise;
    const db = client.db("satistakip");

    const { productId, accountId, type, startDate, endDate } = req.query;

    const filter = { userId: decoded.userId };

    if (productId) filter.productId = new ObjectId(productId);
    if (accountId) filter.accountId = new ObjectId(accountId);
    if (type) filter.type = type;
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const logs = await db.collection("stock_logs")
      .aggregate([
        { $match: filter },
        { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" }},
        { $lookup: { from: "accounts", localField: "accountId", foreignField: "_id", as: "cari" }},
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    return res.status(200).json(logs.map(row => ({
      id: row._id,
      urun: row.product?.[0]?.ad || "-",
      cari: row.cari?.[0]?.ad || "-",
      type: row.type === "purchase" ? "Alış" : "Satış",
      qty: row.quantity,
      price: row.unitPrice,
      total: row.total,
      currency: row.currency,
      date: row.createdAt,
    })));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
