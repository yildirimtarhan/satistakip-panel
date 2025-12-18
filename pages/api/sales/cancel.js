import clientPromise from "@/lib/mongodb";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "POST gerekli" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { saleNo, reason } = req.body;
    if (!saleNo) {
      return res.status(400).json({ message: "saleNo zorunlu" });
    }

    const db = (await clientPromise).db();

    // 🔹 Satış satırlarını al
    const match =
      decoded.role === "admin"
        ? { type: "sale", saleNo, isDeleted: { $ne: true } }
        : {
            type: "sale",
            saleNo,
            userId: decoded.userId,
            isDeleted: { $ne: true },
          };

    const rows = await db.collection("transactions").find(match).toArray();
    if (!rows.length) {
      return res.status(404).json({ message: "Satış bulunamadı" });
    }

    const sale = rows[0];

    // ===============================
    // 1) STOK GERİ EKLE
    // ===============================
    for (const r of rows) {
      await db.collection("products").updateOne(
        { _id: r.productId },
        { $inc: { stok: r.qty } }
      );

      // stok log
      await db.collection("stock_logs").insertOne({
        productId: r.productId,
        qty: r.qty,
        type: "sale_cancel",
        saleNo,
        date: new Date(),
        userId: decoded.userId,
      });
    }

    // ===============================
    // 2) CARİ TERS HAREKET
    // ===============================
    await db.collection("transactions").insertOne({
      type: "sale_cancel",
      saleNo,
      accountId: sale.accountId,
      totalTRY: -sale.totalTRY,
      currency: "TRY",
      date: new Date(),
      note: `Satış iptali${reason ? " - " + reason : ""}`,
      userId: decoded.userId,
    });

    // ===============================
    // 3) SATIŞI SOFT DELETE
    // ===============================
    await db.collection("transactions").updateMany(
      { type: "sale", saleNo },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: decoded.userId,
          deleteReason: reason || "",
        },
      }
    );

    return res.json({
      success: true,
      message: "Satış iptal edildi",
    });
  } catch (err) {
    console.error("Sale cancel error:", err);
    return res.status(500).json({ message: "Satış iptal edilemedi" });
  }
}
