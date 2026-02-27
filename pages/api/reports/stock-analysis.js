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

    // 1. ÜRÜN BAZLI STOK DURUMU (Product modeli: name, sku, category, stock, priceTl, profitMargin)
    const productMatch = buildReportFilter(context, {
      ...(category && { category })
    });

    const products = await Product.find(productMatch)
      .select("name sku category stock priceTl discountPriceTl profitMargin createdAt")
      .lean();

    const defaultMinStock = 0;
    let enrichedProducts = products.map(p => {
      const stokMiktari = Number(p.stock) ?? 0;
      const satisFiyati = Number(p.discountPriceTl) || Number(p.priceTl) || 0;
      const marginPct = Number(p.profitMargin) || 20;
      const alisFiyati = satisFiyati > 0 ? satisFiyati / (1 + marginPct / 100) : 0;
      const minStokSeviyesi = defaultMinStock;
      const stokDegeri = stokMiktari * alisFiyati;
      const potansiyelGelir = stokMiktari * satisFiyati;
      const karMarji = (satisFiyati - alisFiyati) * stokMiktari;
      const isLowStock = minStokSeviyesi > 0 ? stokMiktari <= minStokSeviyesi : stokMiktari <= 0;
      return {
        _id: p._id,
        urunAdi: p.name || p.sku || "—",
        sku: p.sku || "—",
        kategori: p.category || "—",
        stokMiktari,
        minStokSeviyesi,
        alisFiyati,
        satisFiyati,
        stokDegeri,
        potansiyelGelir,
        karMarji,
        isLowStock,
        createdAt: p.createdAt
      };
    });

    if (lowStock === "true") {
      enrichedProducts = enrichedProducts.filter(p => p.isLowStock);
    }

    // 2. KATEGORİ DAĞILIMI (Product: category, stock)
    const categoryDist = await Product.aggregate([
      { $match: buildReportFilter(context) },
      {
        $group: {
          _id: { $ifNull: ["$category", "Kategorisiz"] },
          urunSayisi: { $sum: 1 },
          toplamStok: { $sum: "$stock" },
          stokDegeri: {
            $sum: {
              $multiply: [
                "$stock",
                {
                  $divide: [
                    "$priceTl",
                    { $add: [1, { $divide: [{ $ifNull: ["$profitMargin", 20] }, 100] }] }
                  ]
                }
              ]
            }
          }
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
      const logMatch = {};
      if (dateFilter) logMatch.createdAt = dateFilter;
      if (movementType) logMatch.type = movementType;

      const sampleLog = await StockLog.findOne().lean();
      if (sampleLog && sampleLog.companyId) {
        logMatch.companyId = companyId;
      }

      movements = await StockLog.aggregate([
        { $match: Object.keys(logMatch).length ? logMatch : {} },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "urun"
          }
        },
        { $unwind: { path: "$urun", preserveNullAndEmptyArrays: true } },
        { $match: { "urun.companyId": companyId } },
        {
          $group: {
            _id: {
              urun: "$urun.name",
              sku: "$urun.sku",
              hareketTuru: "$type"
            },
            toplamMiktar: { $sum: "$quantity" },
            sonHareket: { $max: "$createdAt" }
          }
        },
        { $sort: { toplamMiktar: -1 } }
      ]);

      dailyMovements = await StockLog.aggregate([
        { $match: Object.keys(logMatch).length ? logMatch : {} },
        {
          $group: {
            _id: {
              tarih: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              hareketTuru: "$type"
            },
            toplamMiktar: { $sum: "$quantity" }
          }
        },
        { $sort: { "_id.tarih": 1 } }
      ]);
    } catch (e) {
      console.error("Stok hareketleri alınamadı:", e);
    }

    // 4. KRİTİK STOKLAR (Ayrı liste)
    const criticalStock = enrichedProducts.filter(p => p.isLowStock);

    // 5. ÖZET İSTATİSTİKLER (summary alanları frontend ile uyumlu)
    const summary = {
      toplamUrun: enrichedProducts.length,
      toplamStokDegeri: enrichedProducts.reduce((acc, p) => acc + (p.stokDegeri || 0), 0),
      toplamPotansiyelGelir: enrichedProducts.reduce((acc, p) => acc + (p.potansiyelGelir || 0), 0),
      kritikStokSayisi: criticalStock.length,
      toplamStokAdedi: enrichedProducts.reduce((acc, p) => acc + (p.stokMiktari || 0), 0)
    };

    // 6. En çok satan ürünler (StockLog çıkışlarına göre; yoksa stok hareketi çok olanlar)
    const topMovingProducts = movements.slice(0, 20).map(m => ({
      urun: {
        urunAdi: m._id?.urun || "—",
        sku: m._id?.sku || "—"
      },
      toplamCikis: m.toplamMiktar || 0
    }));

    // 7. Stok yaşlandırma (en uzun süredir stokta olanlar - createdAt'e göre)
    const stockAging = [...enrichedProducts]
      .filter(p => p.createdAt)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 30)
      .map(p => ({ ...p, gunStokta: p.createdAt ? Math.floor((Date.now() - new Date(p.createdAt)) / (24 * 60 * 60 * 1000)) : 0 }));

    // 8. Yavaş hareket eden ürünler (stok var ama hareket yok veya çok az - topMoving'de olmayan yüksek stoklular)
    const movingSkus = new Set(movements.map(m => m._id?.sku).filter(Boolean));
    const slowMovingProducts = [...enrichedProducts]
      .filter(p => p.stokMiktari > 0 && !movingSkus.has(p.sku))
      .sort((a, b) => (b.stokMiktari || 0) - (a.stokMiktari || 0))
      .slice(0, 20);

    res.status(200).json({
      success: true,
      meta: {
        company: { id: companyId, name: companyName },
        filters: { startDate, endDate, category, lowStock, movementType },
        generatedAt: new Date().toISOString()
      },
      summary,
      products: enrichedProducts,
      criticalStock,
      categoryDistribution: categoryDist,
      topMovingProducts: topMovingProducts.length ? topMovingProducts : enrichedProducts.slice(0, 10).map(p => ({
        urun: { urunAdi: p.urunAdi, sku: p.sku },
        toplamCikis: p.stokMiktari
      })),
      stockAging,
      slowMovingProducts,
      movements: movements.slice(0, 50),
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