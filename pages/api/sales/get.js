import clientPromise from "@/lib/mongodb";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ message: "Unauthorized" });

    const { saleNo } = req.query;
    if (!saleNo) return res.status(400).json({ message: "saleNo gerekli" });

    const db = (await clientPromise).db();

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

    return res.json({
      saleNo: sale.saleNo,
      accountId: sale.accountId,
      currency: sale.currency,
      fxRate: sale.fxRate,
      date: sale.date,
      paymentType: sale.paymentType,
      discountRate: sale.discountRate || 0,
      note: sale.note || "",
      items: rows.map((r) => ({
        productId: r.productId,
        name: r.productName,
        qty: r.qty,
        unitPrice: r.unitPrice,
        vatRate: r.vatRate,
      })),
    });
  } catch (err) {
    console.error("Sale get error:", err);
    return res.status(500).json({ message: "Satış okunamadı" });
  }
}
