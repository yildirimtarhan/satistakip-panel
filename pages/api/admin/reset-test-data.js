import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";
import Sale from "@/models/Sale";
import Purchase from "@/models/Purchase";
import Cari from "@/models/Cari";

/**
 * Admin-only: Test verilerini sıfırlar.
 * - Tüm cari hareketleri (Transaction) silinir
 * - Tüm satışlar (Sale) silinir
 * - Tüm alışlar (Purchase) silinir
 * - Tüm carilerin bakiye, totalSales, totalPurchases = 0 yapılır
 * Yapı bozulmaz, sadece veriler temizlenir.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST" });
  }

  try {
    await dbConnect();

    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token gerekli" });
    }
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Sadece admin bu işlemi yapabilir" });
    }

    const result = {
      deleted: { transactions: 0, sales: 0, purchases: 0 },
      updated: { cariler: 0 },
    };

    const dr = await Transaction.deleteMany({});
    result.deleted.transactions = dr.deletedCount;

    const sr = await Sale.deleteMany({});
    result.deleted.sales = sr.deletedCount;

    const pr = await Purchase.deleteMany({});
    result.deleted.purchases = pr.deletedCount;

    const cr = await Cari.updateMany(
      {},
      { $set: { bakiye: 0, totalSales: 0, totalPurchases: 0 } }
    );
    result.updated.cariler = cr.modifiedCount;

    return res.status(200).json({
      message: "Test verileri sıfırlandı",
      ...result,
    });
  } catch (err) {
    console.error("reset-test-data hatası:", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Geçersiz veya süresi dolmuş token" });
    }
    return res.status(500).json({ message: "Sıfırlama sırasında hata", error: err.message });
  }
}
