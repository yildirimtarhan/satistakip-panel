import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;
    const userId = decoded.userId || decoded.id;
    const isAdmin = decoded.role === "admin";

    if (!companyId) {
      return res.status(400).json({ message: "Firma bilgisi bulunamadı" });
    }

    const { startDate, endDate, marketplace } = req.query;

    const matchStage = {
      companyId: String(companyId),
      type: "sale",
      isDeleted: { $ne: true },
      status: { $ne: "cancelled" }
    };

    // Admin değilse sadece kendi kayıtları
    if (!isAdmin) {
      matchStage.userId = String(userId);
    }

    if (marketplace && marketplace !== "all") {
      matchStage.marketplace = marketplace;
    }

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    const sales = await Transaction.find(matchStage)
      .sort({ date: -1 })
      .lean();

    // Pazaryerine göre grupla
    const marketplaceStats = {};
    const productStats = {};
    const dailyStats = {};

    sales.forEach(sale => {
      const mp = sale.marketplace || "Mağaza";
      const date = sale.date?.toISOString().split('T')[0] || "Bilinmiyor";
      
      // Pazaryeri istatistikleri
      if (!marketplaceStats[mp]) {
        marketplaceStats[mp] = {
          orderCount: 0,
          totalSales: 0,
          totalQuantity: 0,
          commission: 0
        };
      }
      marketplaceStats[mp].orderCount++;
      marketplaceStats[mp].totalSales += sale.totalTRY || 0;
      marketplaceStats[mp].totalQuantity += sale.quantity || 0;
      marketplaceStats[mp].commission += (sale.totalTRY || 0) * 0.15;

      // Ürün istatistikleri
      sale.items?.forEach(item => {
        const productName = item.name || "Bilinmiyor";
        if (!productStats[productName]) {
          productStats[productName] = {
            quantity: 0,
            revenue: 0,
            marketplace: mp
          };
        }
        productStats[productName].quantity += item.quantity || 0;
        productStats[productName].revenue += item.total || 0;
      });

      // Günlük istatistikler
      if (!dailyStats[date]) {
        dailyStats[date] = { sales: 0, count: 0 };
      }
      dailyStats[date].sales += sale.totalTRY || 0;
      dailyStats[date].count += 1;
    });

    return res.status(200).json({
      marketplaceStats: Object.values(marketplaceStats),
      productStats: Object.entries(productStats).map(([name, s]) => ({ name, ...s })),
      dailyStats: Object.entries(dailyStats).map(([date, s]) => ({ date, ...s })),
    });
  } catch (err) {
    console.error("marketplace-sales err:", err);
    return res.status(500).json({ message: err.message || "Sunucu hatası" });
  }
}