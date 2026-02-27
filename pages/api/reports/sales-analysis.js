/**
 * Satış Analizi Raporu API
 * Multi-tenant: Sadece kullanıcının kendi companyId verileri
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

    // 1. Tenant context al (mevcut sistemi kullanır)
    const context = await getReportContext(req);
    const { companyId, companyName, userName, isAdmin } = context;

    // 2. Query parametreleri
    const { 
      startDate, 
      endDate, 
      marketplace, 
      store, 
      groupBy = "day" // day | month | marketplace
    } = req.query;

    // 3. Filtreleri oluştur
    const dateFilter = buildDateFilter(startDate, endDate);
    const matchFilter = buildReportFilter(context, {
      islemTuru: "satis",
      ...(dateFilter && { tarih: dateFilter }),
      ...(marketplace && { pazaryeri: marketplace }),
      ...(store && { magaza: store })
    });

    // 4. Zaman bazlı satış verileri
    const timelinePipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: groupBy === "month" 
            ? { $dateToString: { format: "%Y-%m", date: "$tarih" } }
            : { $dateToString: { format: "%Y-%m-%d", date: "$tarih" } },
          toplamSatis: { $sum: "$toplamTutar" },
          urunAdedi: { $sum: { $size: "$urunler" } },
          islemSayisi: { $sum: 1 },
          ortalamaSatis: { $avg: "$toplamTutar" },
          komisyonToplam: { $sum: "$komisyonTutari" },
          kargoToplam: { $sum: "$kargoTutari" },
          maliyetToplam: { $sum: "$toplamMaliyet" },
          iadeTutari: { 
            $sum: { $cond: [{ $eq: ["$durum", "iade"] }, "$toplamTutar", 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];

    // Eğer groupBy=marketplace ise farklı pipeline
    if (groupBy === "marketplace") {
      timelinePipeline[1].$group._id = "$pazaryeri";
    }

    const timeline = await Transaction.aggregate(timelinePipeline);

    // 5. Pazaryeri dağılımı
    const marketplaceDist = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$pazaryeri",
          satis: { $sum: "$toplamTutar" },
          islem: { $sum: 1 },
          urunAdet: { $sum: { $size: "$urunler" } }
        }
      },
      { $sort: { satis: -1 } }
    ]);

    // 6. Mağaza dağılımı
    const storeDist = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$magaza",
          satis: { $sum: "$toplamTutar" },
          islem: { $sum: 1 }
        }
      },
      { $sort: { satis: -1 } }
    ]);

    // 7. Genel özet
    const summaryResult = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          toplamCiro: { $sum: "$toplamTutar" },
          toplamIslem: { $sum: 1 },
          toplamUrun: { $sum: { $size: "$urunler" } },
          toplamKomisyon: { $sum: "$komisyonTutari" },
          toplamKargo: { $sum: "$kargoTutari" },
          toplamMaliyet: { $sum: "$toplamMaliyet" },
          iadeTutari: { 
            $sum: { $cond: [{ $eq: ["$durum", "iade"] }, "$toplamTutar", 0] }
          }
        }
      }
    ]);

    const s = summaryResult[0] || {};
    const netCiro = (s.toplamCiro || 0) - (s.iadeTutari || 0);
    const netKar = netCiro - (s.toplamMaliyet || 0) - (s.toplamKomisyon || 0) - (s.toplamKargo || 0);

    // 8. Yanıt
    res.status(200).json({
      success: true,
      meta: {
        company: {
          id: companyId,
          name: companyName
        },
        user: {
          name: userName,
          isAdmin: isAdmin
        },
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          marketplace: marketplace || null,
          store: store || null,
          groupBy
        },
        generatedAt: new Date().toISOString()
      },
      summary: {
        toplamCiro: s.toplamCiro || 0,
        iadeTutari: s.iadeTutari || 0,
        netCiro: netCiro,
        toplamMaliyet: s.toplamMaliyet || 0,
        toplamKomisyon: s.toplamKomisyon || 0,
        toplamKargo: s.toplamKargo || 0,
        netKar: netKar,
        karMarji: netCiro > 0 ? ((netKar / netCiro) * 100).toFixed(2) : 0,
        toplamIslem: s.toplamIslem || 0,
        toplamUrun: s.toplamUrun || 0
      },
      timeline: timeline.map(t => ({
        ...t,
        netSatis: (t.toplamSatis || 0) - (t.iadeTutari || 0),
        netKar: (t.toplamSatis || 0) - (t.iadeTutari || 0) - (t.maliyetToplam || 0) - (t.komisyonToplam || 0) - (t.kargoToplam || 0)
      })),
      marketplaceDistribution: marketplaceDist,
      storeDistribution: storeDist
    });

  } catch (error) {
    console.error("Sales Analysis Error:", error);
    
    if (error.message === "Yetkilendirme hatası") {
      return res.status(401).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Rapor oluşturulurken hata oluştu",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}