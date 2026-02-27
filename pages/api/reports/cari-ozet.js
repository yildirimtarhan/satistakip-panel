/**
 * Cari Özet Raporu - Cari bazlı ciro, tahsilat, bakiye
 * Ekstre ile aynı carileri kullanır; hareketler accountId üzerinden alınır (companyId zorunlu değil).
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getReportContext } from "@/lib/reportHelpers";
import Cari from "@/models/Cari";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Sadece GET desteklenir" });
  }

  try {
    await connectToDatabase();
    const context = await getReportContext(req);
    const { companyId, userId } = context;

    // Kullanıcının görebildiği carileri bul (Cari Ekstre / cari listesi ile aynı mantık)
    let cariQuery = {};
    if (context.isAdmin) {
      cariQuery = {};
    } else {
      cariQuery = { userId: userId };
      // companyId geçerli bir ObjectId ise firma carilerini de dahil et (boş string ObjectId'e cast edilmez)
      const validCompanyId = companyId && String(companyId).trim() && mongoose.Types.ObjectId.isValid(companyId);
      if (validCompanyId) {
        cariQuery.$or = [
          { companyId: new mongoose.Types.ObjectId(companyId) },
          { companyId: { $exists: false } }
        ];
      }
    }
    const carilerList = await Cari.find(cariQuery).select("_id").lean();
    const allowedAccountIds = carilerList.map((c) => c._id).filter(Boolean);
    if (allowedAccountIds.length === 0) {
      return res.status(200).json({
        success: true,
        summary: { toplamCiro: 0, toplamAlis: 0, toplamTahsilat: 0, toplamBakiye: 0, toplamCiroUSD: 0, toplamCiroEUR: 0, toplamAlisUSD: 0, toplamAlisEUR: 0, cariSayisi: 0, toplamBorclu: 0, toplamAlacak: 0 },
        borcluFirmalar: [],
        alacakliFirmalar: [],
        dovizliAlisYapilanCariler: [],
        dovizliSatisYapilanCariler: [],
        cariler: []
      });
    }

    // Bu carilere ait tüm hareketler (companyId filtreleme yok – ekstre ile aynı veri)
    const agg = await Transaction.aggregate([
      {
        $match: {
          accountId: { $in: allowedAccountIds },
          isDeleted: { $ne: true },
          direction: { $in: ["borc", "alacak"] }
        }
      },
      {
        $group: {
          _id: "$accountId",
          borc: { $sum: { $cond: [{ $eq: ["$direction", "borc"] }, { $ifNull: ["$amount", "$totalTRY"] }, 0] } },
          alacak: { $sum: { $cond: [{ $eq: ["$direction", "alacak"] }, { $ifNull: ["$amount", "$totalTRY"] }, 0] } },
          ciro: { $sum: { $cond: [{ $eq: ["$type", "sale"] }, { $ifNull: ["$amount", "$totalTRY"] }, 0] } },
          alisTutari: { $sum: { $cond: [{ $eq: ["$type", "purchase"] }, { $ifNull: ["$amount", "$totalTRY"] }, 0] } },
          // Dövizli satış: totalFCY yoksa totalTRY/fxRate kullan (eski kayıtlar)
          ciroUSD: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "sale"] }, { $eq: [{ $toUpper: { $ifNull: ["$currency", "TRY"] } }, "USD"] }] }, { $cond: [{ $gt: [{ $ifNull: ["$totalFCY", 0] }, 0] }, { $ifNull: ["$totalFCY", 0] }, { $divide: [{ $ifNull: ["$amount", "$totalTRY"] }, { $max: [{ $ifNull: ["$fxRate", 1] }, 0.0001] }] }] }, 0] } },
          ciroEUR: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "sale"] }, { $eq: [{ $toUpper: { $ifNull: ["$currency", "TRY"] } }, "EUR"] }] }, { $cond: [{ $gt: [{ $ifNull: ["$totalFCY", 0] }, 0] }, { $ifNull: ["$totalFCY", 0] }, { $divide: [{ $ifNull: ["$amount", "$totalTRY"] }, { $max: [{ $ifNull: ["$fxRate", 1] }, 0.0001] }] }] }, 0] } },
          // Dövizli alış: totalFCY yoksa totalTRY/fxRate (eski kayıtlarda totalFCY 0 kaydedilmişti)
          alisUSD: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "purchase"] }, { $eq: [{ $toUpper: { $ifNull: ["$currency", "TRY"] } }, "USD"] }] }, { $cond: [{ $gt: [{ $ifNull: ["$totalFCY", 0] }, 0] }, { $ifNull: ["$totalFCY", 0] }, { $divide: [{ $ifNull: ["$amount", "$totalTRY"] }, { $max: [{ $ifNull: ["$fxRate", 1] }, 0.0001] }] }] }, 0] } },
          alisEUR: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "purchase"] }, { $eq: [{ $toUpper: { $ifNull: ["$currency", "TRY"] } }, "EUR"] }] }, { $cond: [{ $gt: [{ $ifNull: ["$totalFCY", 0] }, 0] }, { $ifNull: ["$totalFCY", 0] }, { $divide: [{ $ifNull: ["$amount", "$totalTRY"] }, { $max: [{ $ifNull: ["$fxRate", 1] }, 0.0001] }] }] }, 0] } },
          accountName: { $max: "$accountName" }
        }
      }
    ]);

    const accountIds = agg.map((r) => r._id).filter(Boolean);
    const carilerMap = {};
    if (accountIds.length > 0) {
      const cariler = await Cari.find({ _id: { $in: accountIds } })
        .select("ad unvan email telefon bakiye")
        .lean();
      cariler.forEach((c) => {
        carilerMap[c._id.toString()] = c;
      });
    }

    const list = agg.map((r) => {
      const id = r._id.toString();
      const cari = carilerMap[id];
      const borc = r.borc || 0;
      const alacak = r.alacak || 0;
      const ad = (cari && (cari.ad || cari.unvan)) || r.accountName || "—";
      return {
        _id: id,
        ad,
        unvan: (cari && cari.unvan) || "",
        email: (cari && cari.email) || "",
        telefon: (cari && cari.telefon) || "",
        ciro: r.ciro || 0,
        alisTutari: r.alisTutari || 0,
        ciroUSD: r.ciroUSD || 0,
        ciroEUR: r.ciroEUR || 0,
        alisUSD: r.alisUSD || 0,
        alisEUR: r.alisEUR || 0,
        tahsilat: alacak,
        bakiye: borc - alacak
      };
    });

    const toplamCiro = list.reduce((s, c) => s + c.ciro, 0);
    const toplamAlis = list.reduce((s, c) => s + c.alisTutari, 0);
    const toplamTahsilat = list.reduce((s, c) => s + c.tahsilat, 0);
    const toplamBakiye = list.reduce((s, c) => s + c.bakiye, 0);
    const toplamCiroUSD = list.reduce((s, c) => s + (c.ciroUSD || 0), 0);
    const toplamCiroEUR = list.reduce((s, c) => s + (c.ciroEUR || 0), 0);
    const toplamAlisUSD = list.reduce((s, c) => s + (c.alisUSD || 0), 0);
    const toplamAlisEUR = list.reduce((s, c) => s + (c.alisEUR || 0), 0);
    const borcluFirmalar = list.filter((c) => c.alisTutari > 0 && c.bakiye > 0);
    const alacakliFirmalar = list.filter((c) => c.ciro > 0 && c.bakiye > 0);
    const dovizliAlisYapilanCariler = list.filter((c) => (c.alisUSD || 0) > 0 || (c.alisEUR || 0) > 0);
    const dovizliSatisYapilanCariler = list.filter((c) => (c.ciroUSD || 0) > 0 || (c.ciroEUR || 0) > 0);

    return res.status(200).json({
      success: true,
      summary: {
        toplamCiro,
        toplamAlis,
        toplamTahsilat,
        toplamBakiye,
        toplamCiroUSD,
        toplamCiroEUR,
        toplamAlisUSD,
        toplamAlisEUR,
        cariSayisi: list.length,
        toplamBorclu: borcluFirmalar.reduce((s, c) => s + c.bakiye, 0),
        toplamAlacak: alacakliFirmalar.reduce((s, c) => s + c.bakiye, 0)
      },
      borcluFirmalar: borcluFirmalar.sort((a, b) => (b.bakiye || 0) - (a.bakiye || 0)),
      alacakliFirmalar: alacakliFirmalar.sort((a, b) => (b.bakiye || 0) - (a.bakiye || 0)),
      dovizliAlisYapilanCariler: dovizliAlisYapilanCariler.sort((a, b) => (b.alisUSD || 0) + (b.alisEUR || 0) - (a.alisUSD || 0) - (a.alisEUR || 0)),
      dovizliSatisYapilanCariler: dovizliSatisYapilanCariler.sort((a, b) => (b.ciroUSD || 0) + (b.ciroEUR || 0) - (a.ciroUSD || 0) - (a.ciroEUR || 0)),
      cariler: list.sort((a, b) => Math.max(b.ciro || 0, b.alisTutari || 0) - Math.max(a.ciro || 0, a.alisTutari || 0))
    });
  } catch (err) {
    console.error("Cari özet hatası:", err);
    if (err.message === "Yetkilendirme hatası") {
      return res.status(401).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message || "Rapor oluşturulamadı" });
  }
}
