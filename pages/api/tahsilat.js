// pages/api/tahsilat.js
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    // 🔐 TOKEN
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token yok" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    await dbConnect();

    const {
      accountId,
      type,           // "tahsilat" | "odeme"
      amount,
      paymentMethod,
      note,
      date,
    } = req.body;

    if (!accountId || !type || !amount) {
      return res.status(400).json({ message: "Zorunlu alanlar eksik" });
    }

    if (!["tahsilat", "odeme"].includes(type)) {
      return res.status(400).json({ message: "Geçersiz işlem tipi" });
    }

    const cari = await Cari.findOne({ _id: accountId, userId });
    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    const tutar = Number(amount);
    let bakiye = cari.balance || 0;

    if (type === "tahsilat") bakiye -= tutar;
    else bakiye += tutar;

    const trx = await Transaction.create({
      userId,
      accountId,
      type,
      amount: tutar,
      paymentMethod,
      note,
      date: date ? new Date(date) : new Date(),
    });

    cari.balance = bakiye;
    await cari.save();

    return res.status(200).json({
      success: true,
      transaction: trx,
      balance: bakiye,
    });

  } catch (err) {
    console.error("TAHSİLAT API ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
