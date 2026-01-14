import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET" });
  }

  try {
    await dbConnect();

    // 🔐 AUTH
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const tokenUser = verifyToken(token);

    if (!tokenUser?.userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const dbUser = await User.findById(tokenUser.userId).select("_id role");
    if (!dbUser) {
      return res.status(401).json({ message: "Kullanıcı yok" });
    }

    const userId = String(dbUser._id);

    // 🔎 QUERY
    const { start, end } = req.query;

    const match = {
  type: "sale",
  direction: "borc",
  userId: userId,

 // ✅ İPTAL / SİLİNEN SATIŞLARI GİZLE
isDeleted: { $ne: true },
// ✅ Ekstra sağlamlaştırma (istersen)
  status: { $ne: "cancelled" },
};


    // 📅 TARİH
    if (start || end) {
      match.date = {};
      if (start) match.date.$gte = new Date(start);
      if (end) match.date.$lte = new Date(end);
    }

    const list = await Transaction.aggregate([
  { $match: match },

  // 🔗 CARİ JOIN
  {
    $lookup: {
      from: "caris",
      localField: "accountId",
      foreignField: "_id",
      as: "cari",
    },
  },

  { $unwind: { path: "$cari", preserveNullAndEmptyArrays: true } },

  // 🧠 CARİ ADI – DOĞRU FALLBACK
  {
    $addFields: {
      accountName: {
        $ifNull: [
          "$accountName",          // ✅ satış anındaki snapshot
          {
            $ifNull: [
              "$cari.unvan",
              {
                $ifNull: [
                  "$cari.firmaAdi",
                  {
                    $ifNull: ["$cari.ad", "-"],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  },

  {
    $project: {
      _id: 1,
      saleNo: 1,
      date: 1,
      accountName: 1,
      totalTRY: 1,
      currency: 1,
    },
  },

  { $sort: { date: -1, createdAt: -1 } },
]);



    // ❗❗❗ FRONTEND UYUMLU
    return res.status(200).json({
  total: list.length,
  records: list,
});

  } catch (err) {
    console.error("SALES REPORT ERROR:", err);
    return res.status(500).json({ message: "Satışlar alınamadı" });
  }
}
