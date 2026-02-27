/**
 * Kar/Zarar Analizi API
 * Gelir - Gider - Karlılık raporu
 */

import { connectToDatabase } from "@/lib/mongodb";
import { getReportContext, buildReportFilter, buildDateFilter } from "@/lib/reportHelpers";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Sadece GET desteklenir" });
  }

  try {
    await connectToDatabase();
    const context = await getReportContext(req);
    const { companyId, companyName } = context;

    const { startDate, endDate, groupBy = "monthly" } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate);

    // GELİRLER (Satışlar)
    const gelirMatch = buildReportFilter(context, {
      islemTuru: "satis",
      ...(dateFilter && { tarih: dateFilter })
    });

    const gelirler = await Transaction.aggregate([
      { $match: gelirMatch },
      {
        $group: {
          _id: groupBy === "monthly" 
            ? { $dateToString: { format: "%Y-%m", date: "$tarih" } }
            : { $dateToString: { format: "%Y-%m-%d", date: "$tarih" } },
          brutSatis: { $sum: "$toplamTutar" },
          maliyet: { $sum: "$toplamMaliyet" },
          komisyon: { $sum: "$komisyonTutari" },
          kargo: { $sum: "$kargoTutari" },
          iade: { $sum: { $cond: [{ $eq: ["$durum", "iade"] }, "$toplamTutar", 0] } }
        }
      },
      {
        $addFields: {
          netSatis: { $subtract: ["$brutSatis", "$iade"] },
          netKar: {
            $subtract: [
              { $subtract: ["$brutSatis", "$iade"] },
              { $add: ["$maliyet", "$komisyon", "$kargo"] }
            ]
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // GİDERLER (Alışlar)
    const giderMatch = buildReportFilter(context, {
      islemTuru: "alis",
      ...(dateFilter && { tarih: dateFilter })
    });

    const giderler = await Transaction.aggregate([
      { $match: giderMatch },
      {
        $group: {
          _id: groupBy === "monthly" 
            ? { $dateToString: { format: "%Y-%m", date: "$tarih" } }
            : { $dateToString: { format: "%Y-%m-%d", date: "$tarih" } },
          alisTutari: { $sum: "$toplamTutar" },
          islemSayisi: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // PAZARYERİ BAZLI KARLILIK
    const marketplaceKar = await Transaction.aggregate([
      { $match: gelirMatch },
      {
        $group: {
          _id: "$pazaryeri",
          satis: { $sum: "$toplamTutar" },
          maliyet: { $sum: "$toplamMaliyet" },
          komisyon: { $sum: "$komisyonTutari" },
          kargo: { $sum: "$kargoTutari" }
        }
      },
      {
        $addFields: {
          netKar: { $subtract: ["$satis", { $add: ["$maliyet", "$komisyon", "$kargo"] }] },
          karMarji: {
            $multiply: [
              { $divide: [{ $subtract: ["$satis", { $add: ["$maliyet", "$komisyon", "$kargo"] }] }, "$satis"] },
              100
            ]
          }
        }
      },
      { $sort: { netKar: -1 } }
    ]);

    // GENEL ÖZET
    const toplamGelir = gelirler.reduce((acc, g) => acc + (g.netSatis || 0), 0);
    const toplamGider = giderler.reduce((acc, g) => acc + (g.alisTutari || 0), 0);
    const toplamMaliyet = gelirler.reduce((acc, g) => acc + (g.maliyet || 0), 0);
    const toplamKomisyon = gelirler.reduce((acc, g) => acc + (g.komisyon || 0), 0);
    const toplamKargo = gelirler.reduce((acc, g) => acc + (g.kargo || 0), 0);
    const toplamIade = gelirler.reduce((acc, g) => acc + (g.iade || 0), 0);

    const netKar = toplamGelir - toplamMaliyet - toplamKomisyon - toplamKargo;

    res.status(200).json({
      success: true,
      meta: {
        company: { id: companyId, name: companyName },
        filters: { startDate, endDate, groupBy },
        generatedAt: new Date().toISOString()
      },
      summary: {
        toplamGelir,
        toplamGider,
        toplamMaliyet,
        toplamKomisyon,
        toplamKargo,
        toplamIade,
        netKar,
        karMarji: toplamGelir > 0 ? ((netKar / toplamGelir) * 100).toFixed(2) : 0
      },
      gelirler,
      giderler,
      marketplaceAnalysis: marketplaceKar
    });

  } catch (error) {
    console.error("Profit/Loss Error:", error);
    
    if (error.message === "Yetkilendirme hatası") {
      return res.status(401).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Kar/zarar raporu oluşturulurken hata oluştu" 
    });
  }
}