import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET" });
  }

  try {
    await dbConnect();

    // =========================
    // 🔐 AUTH
    // =========================
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const tokenUser = verifyToken(token);

    console.log("TOKEN USER:", tokenUser);

    if (!tokenUser?.userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const dbUser = await User.findById(tokenUser.userId).select(
      "_id role email name companyId"
    );

    if (!dbUser) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    const role = dbUser.role || tokenUser.role || "user";
    const userId = String(dbUser._id);
    const companyId = dbUser.companyId ? String(dbUser.companyId) : "";

    // =========================
    // 🔎 QUERY PARAMS
    // =========================
    const { start, end, accountId, saleNo, minTotal, maxTotal } = req.query;

    // =========================
    // 🔎 BASE MATCH
    // =========================
    const match = {
      type: "sale",
      isDeleted: { $ne: true },
      direction: { $in: ["debit", "borc"] }, // eski + yeni uyum
    };

    // =========================
    // 🏢 MULTI-TENANT
    // =========================
    if (role === "admin") {
      // admin → her şeyi görür
    } else if (companyId && "companyId" in (Transaction.schema?.paths || {})) {
      match.companyId = companyId;
    } else {
      // fallback
      match.userId = userId;
    }

    // =========================
    // 📅 DATE FILTER
    // =========================
    if (start || end) {
      match.date = {};
      if (start) match.date.$gte = new Date(start);
      if (end) match.date.$lte = new Date(end);
    }

    // =========================
    // 👤 CARI FILTER
    // =========================
    if (accountId) {
      match.accountId = accountId;
    }

    // =========================
    // 🔢 SALE NO FILTER
    // =========================
    if (saleNo) {
      match.$or = [
        { saleNo: { $regex: saleNo, $options: "i" } },
        { refNo: { $regex: saleNo, $options: "i" } },
      ];
    }

    // =========================
    // 💰 TOTAL FILTER
    // =========================
    if (minTotal || maxTotal) {
      match.totalTRY = {};
      if (minTotal) match.totalTRY.$gte = Number(minTotal);
      if (maxTotal) match.totalTRY.$lte = Number(maxTotal);
    }

    // =========================
    // 📊 AGGREGATE
    // =========================
    const list = await Transaction.aggregate([
      { $match: match },

      // 🔗 Cari join
      {
        $lookup: {
          from: "cari",
          localField: "_accountObjId",
          foreignField: "_id",
          as: "cari",
        },
      },
      { $unwind: { path: "$cari", preserveNullAndEmptyArrays: true } },

      { $sort: { date: -1, createdAt: -1 } },

      // normalize alanlar
      {
        $addFields: {
          _saleNo: { $ifNull: ["$saleNo", "$refNo"] },
          _accountName: {
            $ifNull: [
              "$cari.unvan",
              {
                $ifNull: [
                  "$cari.firmaAdi",
                  {
                    $ifNull: [
                      "$cari.ad",
                      { $ifNull: ["$cari.name", "$cari.email"] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },

      // frontend projection
      {
        $project: {
          _id: 1,
          saleNo: { $ifNull: ["$_saleNo", "-"] },
          date: 1,
          currency: 1,
          totalTRY: { $ifNull: ["$totalTRY", 0] },
          paymentType: 1,
          partialPaymentTRY: 1,
          accountName: { $ifNull: ["$_accountName", "-"] },
        },
      },
    ]);

    return res.status(200).json({
      total: list.length,
      records: list,
    });
  } catch (err) {
    console.error("SALES REPORT ERROR:", err);
    return res.status(500).json({
      message: "Satış raporu alınamadı",
      error: err.message,
    });
  }
}
