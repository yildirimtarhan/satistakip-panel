import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "GET only" });
  }

  try {
    await dbConnect();

    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Token yok" });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    const { accountId, start, end } = req.query;

    if (!accountId) {
      return res.status(400).json({ message: "accountId zorunlu" });
    }

    const filter = { accountId };

    if (start || end) {
      filter.createdAt = {};
      if (start) filter.createdAt.$gte = new Date(start);
      if (end) filter.createdAt.$lte = new Date(end);
    }

    const txs = await Transaction.find(filter).sort({ createdAt: 1 });

    let bakiye = 0;

    const rows = txs.map((t) => {
      // BORÇ → +
      if (t.type === "purchase" || t.type === "payment") {
        bakiye += Number(t.totalTRY || 0);
      }
      // ALACAK → -
      if (t.type === "sale" || t.type === "collection") {
        bakiye -= Number(t.totalTRY || 0);
      }

      return {
        _id: t._id,
        tarih: t.createdAt,
        tur: t.type,
        tutar: Number(t.totalTRY || 0),
        bakiye,
        aciklama: t.note || "",
        belgeNo: t.invoiceNo || "",
      };
    });

    res.json({
      success: true,
      rows,
      bakiye,
    });
  } catch (err) {
    console.error("Cari ekstre hata:", err);
    res.status(500).json({ message: "Cari ekstre alınamadı" });
  }
}
