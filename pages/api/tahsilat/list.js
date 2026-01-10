import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "GET only" });

  try {
    await dbConnect();

    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token yok" });

    const token = auth.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || null;
    const role = decoded.role || "user";

    const { accountId } = req.query;
    if (!accountId) return res.status(400).json({ message: "accountId gerekli" });

    const match = {
      accountId,
      type: "payment",
    };

    // admin değilse tenant filtre
    if (role !== "admin") {
      if (companyId) match.companyId = companyId;
      else match.userId = userId;
    }

    const list = await Transaction.find(match).sort({ date: -1 }).lean();
    return res.json(list);
  } catch (err) {
    console.error("TAHSILAT LIST ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
