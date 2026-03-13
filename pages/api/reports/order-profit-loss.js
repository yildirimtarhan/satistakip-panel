/**
 * Sipariş Bazlı Net Kâr/Zarar Raporu API
 * Her siparişte: brüt satış, maliyet, komisyon, kargo → net kâr/zarar
 */

import { connectToDatabase } from "@/lib/mongodb";
import { getReportContext, buildReportFilter, buildDateFilter } from "@/lib/reportHelpers";
import Transaction from "@/models/Transaction";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Sadece GET desteklenir" });
  }

  try {
    await connectToDatabase();
    const context = await getReportContext(req);
    const { companyId, companyName } = context;

    const { startDate, endDate, marketplace, page = 1, limit = DEFAULT_LIMIT } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate);
    const skip = Math.max(0, (parseInt(page, 10) || 1) - 1) * Math.min(parseInt(limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
    const lim = Math.min(parseInt(limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);

    const cleanMatch = {
      ...buildReportFilter(context),
      $and: [
        { $or: [{ islemTuru: "satis" }, { type: "sale" }] },
        ...(dateFilter ? [{ $or: [{ tarih: dateFilter }, { date: dateFilter }] }] : []),
        ...(marketplace && marketplace !== "all" ? [{ $or: [{ pazaryeri: marketplace }, { marketplace }] }] : []),
        { $or: [{ status: { $exists: false } }, { status: { $nin: ["cancelled", "iptal"] } }] },
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      ].filter(Boolean),
    };

    // Bireysel siparişler (sayfalı)
    const ordersPipeline = [
      { $match: cleanMatch },
      {
        $addFields: {
          brutSatis: { $ifNull: ["$toplamTutar", "$totalTRY"] },
          maliyet: { $ifNull: ["$toplamMaliyet", 0] },
          komisyon: { $ifNull: ["$komisyonTutari", 0] },
          kargo: { $ifNull: ["$kargoTutari", 0] },
          iadeTutar: { $cond: [{ $in: ["$durum", ["iade", "reversed"]] }, { $ifNull: ["$toplamTutar", "$totalTRY"] }, 0] },
        },
      },
      {
        $addFields: {
          netSatis: { $subtract: ["$brutSatis", "$iadeTutar"] },
          toplamGider: { $add: ["$maliyet", "$komisyon", "$kargo"] },
        },
      },
      {
        $addFields: {
          netKar: { $subtract: ["$netSatis", "$toplamGider"] },
        },
      },
      {
        $project: {
          saleNo: 1,
          tarih: 1,
          date: 1,
          pazaryeri: 1,
          marketplace: 1,
          brutSatis: 1,
          maliyet: 1,
          komisyon: 1,
          kargo: 1,
          iadeTutar: 1,
          netSatis: 1,
          netKar: 1,
          durum: 1,
          status: 1,
        },
      },
      { $addFields: { _sortDate: { $ifNull: ["$tarih", "$date"] } } },
      { $sort: { _sortDate: -1, _id: -1 } },
      { $skip: skip },
      { $limit: lim },
    ];

    const orders = await Transaction.aggregate(ordersPipeline);

    // Özet istatistikler
    const summaryPipeline = [
      { $match: cleanMatch },
      {
        $addFields: {
          brutSatis: { $ifNull: ["$toplamTutar", "$totalTRY"] },
          maliyet: { $ifNull: ["$toplamMaliyet", 0] },
          komisyon: { $ifNull: ["$komisyonTutari", 0] },
          kargo: { $ifNull: ["$kargoTutari", 0] },
          iadeTutar: { $cond: [{ $in: ["$durum", ["iade", "reversed"]] }, { $ifNull: ["$toplamTutar", "$totalTRY"] }, 0] },
        },
      },
      {
        $addFields: {
          netSatis: { $subtract: ["$brutSatis", "$iadeTutar"] },
          toplamGider: { $add: ["$maliyet", "$komisyon", "$kargo"] },
        },
      },
      {
        $addFields: {
          netKar: { $subtract: ["$netSatis", "$toplamGider"] },
        },
      },
      {
        $group: {
          _id: null,
          toplamSiparis: { $sum: 1 },
          zararSiparis: { $sum: { $cond: [{ $lt: ["$netKar", 0] }, 1, 0] } },
          toplamBrutSatis: { $sum: "$brutSatis" },
          toplamNetSatis: { $sum: "$netSatis" },
          toplamNetKar: { $sum: "$netKar" },
          ortalamaKarMarji: { $avg: { $cond: [{ $gt: ["$netSatis", 0] }, { $multiply: [{ $divide: ["$netKar", "$netSatis"] }, 100] }, null] } },
        },
      },
    ];

    const summaryResult = await Transaction.aggregate(summaryPipeline);
    const s = summaryResult[0] || {};

    const totalCount = await Transaction.countDocuments(cleanMatch);

    const formattedOrders = orders.map((o) => ({
      _id: o._id,
      saleNo: o.saleNo || "-",
      tarih: o.tarih || o.date,
      pazaryeri: o.pazaryeri || o.marketplace || "Mağaza",
      brutSatis: Math.round((o.brutSatis || 0) * 100) / 100,
      maliyet: Math.round((o.maliyet || 0) * 100) / 100,
      komisyon: Math.round((o.komisyon || 0) * 100) / 100,
      kargo: Math.round((o.kargo || 0) * 100) / 100,
      netKar: Math.round((o.netKar || 0) * 100) / 100,
      karMarji: (o.netSatis || 0) > 0 ? Math.round(((o.netKar || 0) / (o.netSatis || 1)) * 10000) / 100 : 0,
      durum: o.durum || o.status || "active",
    }));

    res.status(200).json({
      success: true,
      meta: {
        company: { id: companyId, name: companyName },
        filters: { startDate, endDate, marketplace: marketplace || "all" },
        generatedAt: new Date().toISOString(),
      },
      summary: {
        toplamSiparis: s.toplamSiparis || 0,
        zararSiparis: s.zararSiparis || 0,
        toplamBrutSatis: Math.round((s.toplamBrutSatis || 0) * 100) / 100,
        toplamNetKar: Math.round((s.toplamNetKar || 0) * 100) / 100,
        ortalamaKarMarji: s.ortalamaKarMarji != null ? Math.round(s.ortalamaKarMarji * 100) / 100 : 0,
      },
      orders: formattedOrders,
      pagination: {
        page: parseInt(page, 10) || 1,
        limit: lim,
        total: totalCount,
        totalPages: Math.ceil(totalCount / lim),
      },
    });
  } catch (error) {
    console.error("Order Profit/Loss Error:", error);
    if (error.message === "Yetkilendirme hatası") {
      return res.status(401).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: "Sipariş kâr/zarar raporu oluşturulurken hata oluştu",
    });
  }
}
