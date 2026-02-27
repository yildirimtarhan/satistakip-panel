/**
 * Satış Analizi Raporu v2
 * Mevcut Transaction modeline uygun (type: "sale", date, userId)
 */

import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Sadece GET desteklenir" });
  }

  try {
    await dbConnect();

    // Auth - Mevcut yapıyla uyumlu
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Token gerekli" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    const companyId = decoded.companyId;
    const isAdmin = decoded.role === "admin";

    // Kullanıcı bilgisi
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    // Query parametreleri
    const { 
      startDate, 
      endDate, 
      marketplace, 
      groupBy = "day" // day | month | marketplace
    } = req.query;

    // Match stage - MEVCUT MODEL YAPISINA GÖRE
    const matchStage = {
      type: "sale",
      isDeleted: { $ne: true },
      status: { $ne: "cancelled" }
    };

    // Admin değilse sadece kendi kayıtları (mevcut yapı)
    if (!isAdmin) {
      matchStage.userId = String(userId);
    } else if (companyId) {
      // Admin ise ve companyId varsa, o company'nin tüm user'larını bul
      const companyUsers = await User.find({ companyId }).select("_id").lean();
      const userIds = companyUsers.map(u => String(u._id));
      matchStage.userId = { $in: userIds };
    }

    // Tarih filtresi - MEVCUT YAPI (date alanı)
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate + "T23:59:59.999Z");
    }

    // Pazaryeri filtresi
    if (marketplace && marketplace !== "all") {
      matchStage.marketplace = marketplace;
    }

    // Zaman bazlı gruplama
    const timelinePipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: groupBy === "month" 
            ? { $dateToString: { format: "%Y-%m", date: "$date" } }
            : groupBy === "marketplace"
            ? "$marketplace"
            : { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          toplamSatis: { $sum: "$totalTRY" },
          islemSayisi: { $sum: 1 },
          urunAdedi: { $sum: "$quantity" },
          ortalamaSatis: { $avg: "$totalTRY" }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const timeline = await Transaction.aggregate(timelinePipeline);

    // Pazaryeri dağılımı
    const marketplaceDist = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$marketplace",
          satis: { $sum: "$totalTRY" },
          islem: { $sum: 1 },
          urunAdet: { $sum: "$quantity" }
        }
      },
      { $sort: { satis: -1 } }
    ]);

    // Genel özet
    const summaryResult = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          toplamCiro: { $sum: "$totalTRY" },
          toplamIslem: { $sum: 1 },
          toplamUrun: { $sum: "$quantity" }
        }
      }
    ]);

    const s = summaryResult[0] || {};

    res.status(200).json({
      success: true,
      meta: {
        company: {
          id: companyId || userId,
          name: user.firmaAdi || user.ad || "Bilinmiyor"
        },
        user: {
          id: userId,
          name: `${user.ad || ""} ${user.soyad || ""}`.trim() || user.email,
          isAdmin: isAdmin
        },
        filters: { startDate, endDate, marketplace, groupBy },
        generatedAt: new Date().toISOString()
      },
      summary: {
        toplamCiro: s.toplamCiro || 0,
        toplamIslem: s.toplamIslem || 0,
        toplamUrun: s.toplamUrun || 0
      },
      timeline: timeline.map(t => ({
        ...t,
        netSatis: t.toplamSatis // İade düşülmemiş hali
      })),
      marketplaceDistribution: marketplaceDist
    });

  } catch (error) {
    console.error("Sales Analysis v2 Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Rapor oluşturulurken hata oluştu",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}