import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    const user = verifyToken(token);

    if (!user?.userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const { returnSaleNo, amount } = req.body;

    if (!returnSaleNo || !amount) {
      return res.status(400).json({ message: "Eksik parametre" });
    }

    const saleReturn = await Transaction.findOne({
      saleNo: returnSaleNo,
      type: "sale_return",
      ...(user.companyId
        ? { companyId: user.companyId }
        : { userId: user.userId }),
    });

    if (!saleReturn) {
      return res.status(404).json({ message: "İade işlemi bulunamadı" });
    }

    const offset = await Transaction.create({
      type: "payment",
      direction: "borc", // 👈 alacak kapatma
      saleNo: `${returnSaleNo}-MAHSUP`,
      refSaleNo: returnSaleNo,
      accountId: saleReturn.accountId,
      total: Number(amount),
      paymentMethod: "Mahsup",
      description: "Satış iadesi mahsup işlemi",
      userId: user.userId,
      companyId: user.companyId || null,
      createdAt: new Date(),
    });

    return res.status(200).json({
      message: "Mahsup işlemi başarıyla yapıldı",
      offsetId: offset._id,
    });
  } catch (err) {
    console.error("OFFSET ERROR:", err);
    return res.status(500).json({ message: "Mahsup işlemi yapılamadı" });
  }
}
