import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

function getToken(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/token=([^;]+)/);
  return m ? m[1] : "";
}

function isAdmin(decoded) {
  return decoded?.role === "admin" || decoded?.isAdmin === true;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "GET only" });

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "id (accountId) gerekli" });

    await dbConnect();

    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "Token yok" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const actorUserId = String(decoded?.id || decoded?._id || "");
    const admin = isAdmin(decoded);

    let accountObjectId;
    try {
      accountObjectId = new mongoose.Types.ObjectId(id);
    } catch {
      return res.status(400).json({ message: "Geçersiz accountId" });
    }

    const cari = await Cari.findById(accountObjectId).lean();
    if (!cari) return res.status(404).json({ message: "Cari bulunamadı" });

    // User ise sadece kendi carisini görebilir
    if (!admin && String(cari.userId || "") !== actorUserId) {
      return res.status(403).json({ message: "Yetkisiz" });
    }

    // Tenant: admin bile olsa hesaplama cari.userId üzerinden yapılır
    const tenantUserId = String(cari.userId || actorUserId);

    const txs = await Transaction.find({
      userId: tenantUserId,
      accountId: accountObjectId,
      direction: { $in: ["borc", "alacak"] },
    }).lean();

    let borc = 0;
    let alacak = 0;

    for (const t of txs) {
      const v = Number(t.amount || t.totalTRY || 0);
      if (t.direction === "borc") borc += v;
      if (t.direction === "alacak") alacak += v;
    }

    const bakiye = borc - alacak;

    return res.json({
      success: true,
      borc: Number(borc.toFixed(2)),
      alacak: Number(alacak.toFixed(2)),
      bakiye: Number(bakiye.toFixed(2)),
    });
  } catch (err) {
    console.error("🔥 BALANCE API ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
