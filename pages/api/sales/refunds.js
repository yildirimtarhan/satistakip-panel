import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { verifyToken } from "@/utils/auth";

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET" });
  }

  try {
    await dbConnect();

    // 🔐 AUTH
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const tokenUser = verifyToken(token);
    if (!tokenUser?.userId) return res.status(401).json({ message: "Yetkisiz" });

    const dbUser = await User.findById(tokenUser.userId).select("_id role companyId");
    if (!dbUser) return res.status(401).json({ message: "Kullanıcı bulunamadı" });

    const role = dbUser.role || "user";
    const userId = String(dbUser._id);
    const companyId = dbUser.companyId ? String(dbUser.companyId) : "";

    // 🔎 Query
    const { type = "all", start, end } = req.query;

    // 🧩 Tenant match
    const tenantMatch = {};
    if (role !== "admin") {
      if (companyId && "companyId" in (Transaction.schema?.paths || {})) tenantMatch.companyId = companyId;
      else tenantMatch.userId = userId;
    }

    // ✅ Tip eşlemesi (frontend: return/cancel)
    const typeMatch = [];
    if (type === "return") typeMatch.push("sale_return");
    else if (type === "cancel") typeMatch.push("sale_cancel");
    else typeMatch.push("sale_return", "sale_cancel");

    const match = {
      ...tenantMatch,
      type: { $in: typeMatch },
    };

    // 📅 Date filter (end günü dahil)
    if (start || end) {
      match.date = {};
      if (start) match.date.$gte = new Date(start);
      if (end) match.date.$lte = endOfDay(end);
    }

    const list = await Transaction.aggregate([
      { $match: match },

      // 🔗 Cari join (ObjectId + string uyumu)
      {
        $lookup: {
          from: "caris",
          let: { accId: "$accountId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$accId"] },
                    {
                      $eq: [
                        "$_id",
                        {
                          $cond: [
                            { $eq: [{ $type: "$$accId" }, "string"] },
                            { $toObjectId: "$$accId" },
                            "$$accId",
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "cariDoc",
        },
      },
      { $unwind: { path: "$cariDoc", preserveNullAndEmptyArrays: true } },

      // 🧠 cari adı + belge no + total normalize
      {
        $addFields: {
          // Frontend "return/cancel" bekliyor
          uiType: {
            $cond: [{ $eq: ["$type", "sale_return"] }, "return", "cancel"],
          },

          // Belge no: saleNo yoksa refSaleNo, o da yoksa "-"
          saleNoFixed: {
            $ifNull: ["$saleNo", { $ifNull: ["$refSaleNo", "-"] }],
          },

          // Cari: önce Transaction.accountName, sonra cariDoc alanları
          cariFixed: {
            $ifNull: [
              "$accountName",
              {
                $ifNull: [
                  "$cariDoc.unvan",
                  {
                    $ifNull: [
                      "$cariDoc.firmaAdi",
                      {
                        $ifNull: ["$cariDoc.ad", "-"],
                      },
                    ],
                  },
                ],
              },
            ],
          },

          totalFixed: {
            $ifNull: ["$totalTRY", { $ifNull: ["$amount", 0] }],
          },
        },
      },

      // 🎯 Frontend'in beklediği alanlara projection
      {
        $project: {
          _id: 1,
          date: 1,
          type: "$uiType",
          saleNo: "$saleNoFixed",
          cari: "$cariFixed",
          total: "$totalFixed",
        },
      },

      { $sort: { date: -1, createdAt: -1 } },
    ]);

    return res.status(200).json(list);
  } catch (err) {
    console.error("REFUNDS ERROR:", err);
    return res.status(500).json({ message: "Liste alınamadı", error: err.message });
  }
}
