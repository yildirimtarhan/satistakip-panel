import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

import Cari from "@/models/Cari";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  res.setHeader("Allow", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await dbConnect();

    // 🔐 TOKEN
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) return res.status(401).json({ message: "Token eksik" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded.userId;
    const companyId = decoded.companyId || null;

    // ============================================================
    // 📌 GET → Cari Listesi (Bakiye Transaction'dan Hesaplanır)
    // ============================================================
    // ============================================================
// 📌 GET → Cari Listesi (Geçiş Modu)
// ============================================================
if (req.method === "GET") {
  let query = {};

  // 🟢 ADMIN → tüm cariler
  if (decoded.role === "admin") {
    query = {};
  } else {
    // 🟡 USER → kendi carileri + geçiş desteği
    query = {
      userId,
    };

    // ✅ Multi-tenant geçiş filtresi
    if (companyId) {
      query.$or = [
        { companyId: new Types.ObjectId(companyId) }, // yeni kayıtlar
        { companyId: { $exists: false } },            // eski kayıtlar
      ];
    }
  }

  // 1) Carileri çek
  const cariler = await Cari.find(query).sort({ createdAt: -1 }).lean();

  // 2) Transaction’dan bakiye hesapla
  const cariIds = cariler.map((c) => c._id);

  const txs = await Transaction.aggregate([
    {
      $match: {
        accountId: { $in: cariIds },
        ...(companyId
          ? { companyId: new Types.ObjectId(companyId) }
          : {}),
      },
    },
    {
      $group: {
        _id: "$accountId",
        borc: {
          $sum: {
            $cond: [{ $eq: ["$direction", "borc"] }, "$amount", 0],
          },
        },
        alacak: {
          $sum: {
            $cond: [{ $eq: ["$direction", "alacak"] }, "$amount", 0],
          },
        },
      },
    },
  ]);

  // 3) Map oluştur
  const balanceMap = {};
  txs.forEach((t) => {
    balanceMap[t._id.toString()] = t.borc - t.alacak;
  });

  // 4) Carilere doğru bakiye bas
  const fixed = cariler.map((c) => ({
    ...c,
    bakiye: balanceMap[c._id.toString()] || 0,
  }));

  return res.status(200).json(fixed);
}

    // ============================================================
    // 📌 POST → Yeni Cari
    // ============================================================
    if (req.method === "POST") {
      const b = req.body || {};

      if (!b.ad) {
        return res.status(400).json({ message: "Cari adı zorunludur." });
      }

      const doc = {
        ad: b.ad,
        tur: b.tur || "Müşteri",
        telefon: b.telefon || "",
        email: b.email || "",
        adres: b.adres || "",
        il: b.il || "",
        ilce: b.ilce || "",

        bakiye: 0,

        userId,
        ...(companyId ? { companyId: new Types.ObjectId(companyId) } : {}),

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const yeni = await Cari.create(doc);

      return res.status(201).json({
        message: "Cari başarıyla eklendi",
        _id: yeni._id,
      });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("🔥 Cari API hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
