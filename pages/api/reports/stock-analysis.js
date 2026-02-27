/**
 * Stok Analizi Raporu API
 * Multi-tenant: Sadece kullanıcının kendi companyId verileri
 */

import { connectToDatabase } from "@/lib/mongodb";
import { getReportContext, buildReportFilter, buildDateFilter } from "@/lib/reportHelpers";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Sadece GET desteklenir" });
  }

  try {
    await connectToDatabase();
    const context = await getReportContext(req);
    const { companyId, companyName } = context;

    const { 
      startDate, 
      endDate, 
      category,
      lowStock = "false",
      movementType // 'giris' | 'cikis'
    } = req.query;

    // Tarih filtresi (stok hareketleri için)
    const dateFilter = buildDateFilter(startDate, endDate);

    // 1. ÜRÜN BAZLI STOK DURUMU
    const productMatch = buildReportFilter(context, {
      ...(category && { kategori: category }),
      ...(lowStock === "true" && { 
        $expr: { $lte: ["$stokMiktari", "$minStokSeviyesi"] }
      })
    });

    const products = await Product.find(productMatch)
      .select("urunAdi sku kategori stokMiktari minStokSeviyesi alisFiyati satisFiyati")
      .lean();

    // Stok değeri hesapla
    const enrichedProducts = products.map(p => ({
      ...p,
      stokDegeri: (p.stokMiktari || 0) * (p.alisFiyati || 0),
      potansiyelGelir: (p.stokMiktari || 0) * (p.satisFiyati || 0),
      karMarji: ((p.satisFiyati || 0) - (p.alisFiyati || 0)) * (p.stokMiktari || 0),
      isLowStock: (p.stokMiktari || 0) <= (p.minStokSeviyesi || 0)
    }));

    // 2. KATEGORİ DAĞILIMI
    const categoryDist = await Product.aggregate([
      { $match: buildReportFilter(context) },
      {
        $group: {
          _id: "$kategori",
          urunSayisi: { $sum: 1 },
          toplamStok: { $sum: "$stokMiktari" },
          stokDegeri: { $sum: { $multiply: ["$stokMiktari", "$alisFiyati"] } }
        }
      },
      { $sort: { stokDegeri: -1 } }
    ]);

    // 3. STOK HAREKETLERİ (Eğer StockLog modelinde companyId varsa)
    let movements = [];
    let dailyMovements = [];
    
    // StockLog şemasında companyId var mı kontrol et
    // Varsa filtrele, yoksa tüm kayıtları getir (geriye uyumluluk)
    try {
      const logMatch = {
        ...(dateFilter && { tarih: dateFilter }),
        ...(movementType && { hareketTuru: movementType })
      };

      // Eğer StockLog'da companyId varsa ekle
      const sampleLog = await StockLog.findOne().lean();
      if (sampleLog && sampleLog.companyId) {
        logMatch.companyId = companyId;
      }

      movements = await StockLog.aggregate([
        { $match: logMatch },
        {
          $lookup: {
            from: "products",
            localField: "urunId",
            foreignField: "_id",
            as: "urun"
          }
        },
        { $unwind: "$urun" },
        // Sadece aynı company'nin ürünlerini göster
        { $match: { "urun.companyId": companyId } },
        {
          $group: {
            _id: {
              urun: "$urun.urunAdi",
              sku: "$urun.sku",
              hareketTuru: "$hareketTuru"
            },
            toplamMiktar: { $sum: "$miktar" },
            sonHareket: { $max: "$tarih" }
          }
        },
        { $sort: { toplamMiktar: -1 } }
      ]);

      dailyMovements = await StockLog.aggregate([
        { $match: logMatch },
        {
          $group: {
            _id: {
              tarih: { $dateToString: { format: "%Y-%m-%d", date: "$tarih" } },
              hareketTuru: "$hareketTuru"
            },
            toplamMiktar: { $sum: "$miktar" }
          }
        },
        { $sort: { "_id.tarih": 1 } }
      ]);
    } catch (e) {
      console.error("Stok hareketleri alınamadı:", e);
    }

    // 4. KRİTİK STOKLAR (Ayrı liste)
    const criticalStock = enrichedProducts.filter(p => p.isLowStock);

    // 5. ÖZET İSTATİSTİKLER
    const stats = {
      toplamUrun: products.length,
      toplamStokDegeri: enrichedProducts.reduce((acc, p) => acc + p.stokDegeri, 0),
      toplamPotansiyelGelir: enrichedProducts.reduce((acc, p) => acc + p.potansiyelGelir, 0),
      kritikStokSayisi: criticalStock.length,
      toplamStokAdedi: enrichedProducts.reduce((acc, p) => acc + p.stokMiktari, 0)
    };

    res.status(200).json({
      success: true,
      meta: {
        company: { id: companyId, name: companyName },
        filters: { startDate, endDate, category, lowStock, movementType },
        generatedAt: new Date().toISOString()
      },
      summary: stats,
      products: enrichedProducts,
      criticalStock,
      categoryDistribution: categoryDist,
      movements: movements.slice(0, 50), // Son 50 hareket
      dailyMovements
    });

  } catch (error) {
    console.error("Stock Analysis Error:", error);
    
    if (error.message === "Yetkilendirme hatası") {
      return res.status(401).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Stok raporu oluşturulurken hata oluştu" 
    });
  }
}