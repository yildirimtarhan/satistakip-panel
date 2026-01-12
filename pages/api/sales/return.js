import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import { verifyToken } from "@/utils/auth";
import mongoose from "mongoose";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    const user = verifyToken(token);

    if (!user?.userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const { type = "all", start, end, accountId } = req.query;

    const match = {
      ...(user.companyId
        ? { companyId: user.companyId }
        : { userId: user.userId }),
    };

    // 🔁 Tür filtresi
    if (type === "return") {
      match.type = "sale_return";
    } else if (type === "cancel") {
      match.type = "sale";
      match.isCancelled = true;
    } else {
      match.$or = [
        { type: "sale_return" },
        { type: "sale", isCancelled: true },
      ];
    }

    // 📅 Tarih filtresi
    if (start || end) {
      match.createdAt = {};
      if (start) match.createdAt.$gte = new Date(start);
      if (end) match.createdAt.$lte = new Date(end);
    }

    // 🧾 Cari filtresi
    if (accountId && mongoose.Types.ObjectId.isValid(accountId)) {
      match.accountId = new mongoose.Types.ObjectId(accountId);
    }

    const rows = await Transaction.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "caris",
          localField: "accountId",
          foreignField: "_id",
          as: "cari",
        },
      },
      { $unwind: { path: "$cari", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json(
      rows.map((r) => ({
        _id: r._id,
        type: r.type === "sale_return" ? "return" : "cancel",
        saleNo: r.saleNo,
        refSaleNo: r.refSaleNo || r.saleNo,
        date: r.createdAt,
        cari:
          r.cari?.unvan ||
          r.cari?.firmaAdi ||
          r.cari?.ad ||
          r.cari?.name ||
          "-",
        total: r.total || 0,
      }))
    );
  } catch (err) {
    console.error("REFUND LIST ERROR:", err);
    return res.status(500).json({ message: "Liste alınamadı" });
  }
}
