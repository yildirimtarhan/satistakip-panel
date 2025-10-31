import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = await clientPromise;
    const db = client.db("satistakip");

    const logs = await db.collection("stock_logs")
      .aggregate([
        { $match: { userId: new ObjectId(decoded.userId) } },
        { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" }},
        { $lookup: { from: "accounts", localField: "accountId", foreignField: "_id", as: "account" }},
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    const formatted = logs.map(l => ({
      date: l.createdAt,
      type: l.type,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      total: l.total,
      currency: l.currency,
      product: l.product[0]?.ad ?? "-",
      account: l.account[0]?.ad ?? "-",
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hata", error: err.message });
  }
}
