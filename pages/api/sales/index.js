import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Yetkisiz" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filter = {
      type: "sale",
      isDeleted: { $ne: true },
    };

    // Multi-tenant: admin tümünü görür, diğerleri sadece kendi firması veya kendi kullanıcı verisi
    if (decoded.role !== "admin") {
      if (decoded.companyId) {
        filter.companyId = new mongoose.Types.ObjectId(decoded.companyId);
      } else if (decoded.userId) {
        filter.userId = new mongoose.Types.ObjectId(decoded.userId);
      }
    }

    const sales = await Transaction.find(filter)
      .select("saleNo date accountId accountName currency totalTRY")
      .sort({ date: -1 })
      .lean();

    const needCariName = sales.filter((s) => s.accountId && !String(s.accountName || "").trim());
    if (needCariName.length > 0) {
      const cariIds = needCariName.map((s) => s.accountId).filter(Boolean);
      const cariler = await Cari.find({ _id: { $in: cariIds } }).select("_id ad").lean();
      const adByCariId = {};
      cariler.forEach((c) => {
        adByCariId[c._id.toString()] = c.ad || "";
      });
      sales.forEach((s) => {
        if (s.accountId && !String(s.accountName || "").trim() && adByCariId[s.accountId.toString()]) {
          s.accountName = adByCariId[s.accountId.toString()];
        }
      });
    }

    res.json(sales);
  } catch (err) {
    console.error("SALES INDEX ERROR:", err);
    res.status(500).json({ message: "Satışlar alınamadı" });
  }
}
