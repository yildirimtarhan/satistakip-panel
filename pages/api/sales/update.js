import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  try {
    if (req.method !== "PUT") return res.status(405).end();

    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { saleNo } = req.query;
    if (!saleNo) {
      return res.status(400).json({ message: "saleNo gerekli" });
    }

    const {
      accountId,
      items,
      totalTRY,
      paymentType,
      date,
      note,
    } = req.body;

    // 🔥 Cari adı (denormalize – satışlar için şart)
    let accountName = "";
    if (accountId) {
      const cari = await Cari.findById(accountId).lean();
      if (cari) {
        accountName =
          cari.unvan || cari.firmaAdi || cari.ad || "";
      }
    }

    const filter = {
      type: "sale",
      saleNo,
      isDeleted: { $ne: true },
    };

    if (decoded.role !== "admin" && decoded.companyId) {
      filter.companyId = new mongoose.Types.ObjectId(decoded.companyId);
    }

    const updated = await Transaction.findOneAndUpdate(
      filter,
      {
        $set: {
          accountId,
          accountName, // 🔥 KRİTİK
          items,
          totalTRY,
          paymentType,
          date,
          note,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Satış bulunamadı" });
    }

    // 🧪 Debug için (şimdilik bırak, sonra kaldırırız)
    console.log("UPDATED SALE:", updated.saleNo, updated.totalTRY);

    return res.json({ success: true });
  } catch (err) {
    console.error("SALE UPDATE ERROR:", err);
    return res.status(500).json({ message: "Satış güncellenemedi" });
  }
}
