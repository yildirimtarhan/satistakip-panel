import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "GET only" });
  }

  try {
    await dbConnect();

    // 🔐 TOKEN
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Token yok" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const isAdmin = decoded.role === "admin";
    const userId = String(decoded.id || decoded._id);

    const { accountId, start, end } = req.query;
    if (!accountId) {
      return res.status(400).json({ message: "accountId zorunlu" });
    }

    const accountObjectId = new mongoose.Types.ObjectId(accountId);

    // 🧾 Cari kontrol
    const cari = await Cari.findById(accountObjectId).lean();
    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    // 🔐 Yetki
    if (!isAdmin && String(cari.userId) !== userId) {
      return res.status(403).json({ message: "Yetkisiz" });
    }

    // 🔎 FİLTRE
    const filter = {
      userId: String(cari.userId), // 🔥 tenant izolasyonu
      accountId: accountObjectId,
    };

    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = new Date(start);
      if (end) {
        const e = new Date(end);
        e.setHours(23, 59, 59, 999);
        filter.date.$lte = e;
      }
    }

    const txs = await Transaction.find(filter).sort({ date: 1 }).lean();

    let bakiye = 0;
    let toplamBorc = 0;
    let toplamAlacak = 0;

    const rows = txs.map((t) => {
      const tutar = Number(t.totalTRY || 0);

      let borc = 0;
      let alacak = 0;

      if (t.type === "sale" || t.type === "purchase") {
        borc = tutar;
        toplamBorc += borc;
      }

      if (t.type === "payment" || t.type === "collection") {
        alacak = tutar;
        toplamAlacak += alacak;
      }

      bakiye += borc - alacak;

      return {
        _id: t._id,
        tarih: t.date,
        aciklama: t.note || "",
        borc,
        alacak,
        bakiye,
      };
    });

    return res.json({
      success: true,
      rows,
      bakiye,
      toplamBorc,
      toplamAlacak,
    });
  } catch (err) {
    console.error("🔥 CARİ EKSTRE ERROR:", err);
    return res.status(500).json({ message: "Cari ekstre alınamadı" });
  }
}
