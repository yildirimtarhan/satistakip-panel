// 📁 /pages/api/reports/sales.js
import clientPromise from "@/lib/mongodb";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  try {
    // 🔐 Token
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const db = (await clientPromise).db();

    // 👤 Admin / Firma ayrımı
    const matchBase =
      decoded.role === "admin"
        ? { type: "sale", isDeleted: { $ne: true } }
        : {
            type: "sale",
            userId: decoded.userId,
            isDeleted: { $ne: true },
          };

    /**
     * 🔎 Aggregation mantığı
     * - transactions koleksiyonundan satışları al
     * - saleNo bazlı grupla
     * - cari (accounts) koleksiyonundan adını çek
     */
    const data = await db
      .collection("transactions")
      .aggregate([
        { $match: matchBase },

        // 🔹 Satış fişi bazlı grupla
        {
          $group: {
            _id: "$saleNo",
            saleNo: { $first: "$saleNo" },
            date: { $first: "$date" },
            accountId: { $first: "$accountId" },
            currency: { $first: "$currency" },
            totalTRY: { $sum: "$totalTRY" },
            total: { $sum: "$total" },
            fxRate: { $first: "$fxRate" },
          },
        },

        // 🔹 Cari bilgisi JOIN
        {
          $lookup: {
            from: "accounts",            // 👈 Cari collection adı
            localField: "accountId",
            foreignField: "_id",
            as: "account",
          },
        },
        {
          $unwind: {
            path: "$account",
            preserveNullAndEmptyArrays: true,
          },
        },

        // 🔹 Son shape (frontend için temiz veri)
        {
          $project: {
            _id: 0,
            saleNo: 1,
            date: 1,
            currency: 1,
            fxRate: 1,
            total: 1,
            totalTRY: 1,
            accountId: 1,
            accountName: { $ifNull: ["$account.ad", "—"] },
          },
        },

        { $sort: { date: -1 } },
      ])
      .toArray();

    return res.status(200).json(data);
  } catch (err) {
    console.error("Sales report error:", err);
    return res.status(500).json({ message: "Rapor alınamadı" });
  }
}
