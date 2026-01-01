import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    const { id } = req.query;

    const txs = await Transaction.find({
      accountId: id,
      status: { $ne: "cancelled" },
    });

    let borc = 0;
    let alacak = 0;

    for (const t of txs) {
      if (t.type === "purchase") borc += t.total || 0;
      if (t.type === "payment") alacak += t.total || 0;
      if (t.type === "sale") alacak += t.total || 0;
    }

    res.json({
      borc,
      alacak,
      bakiye: alacak - borc,
    });
  } catch (err) {
    console.error("Cari summary hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
}
