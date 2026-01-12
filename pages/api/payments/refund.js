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

    const { returnSaleNo, amount, method } = req.body;

    if (!returnSaleNo || !amount) {
      return res.status(400).json({ message: "Eksik parametre" });
    }

    // 🔎 İade işlemini bul
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

    // 💸 PARA İADESİ (ÖDEME)
    const payment = await Transaction.create({
      type: "payment",
      direction: "borc", // 👈 PARA ÇIKIŞI
      saleNo: `${returnSaleNo}-REFUND`,
      refSaleNo: returnSaleNo,
      accountId: saleReturn.accountId,
      total: Number(amount),
      paymentMethod: method || "Nakit",
      description: "Satış iadesi nakit/banka iadesi",
      userId: user.userId,
      companyId: user.companyId || null,
      createdAt: new Date(),
    });

    return res.status(200).json({
      message: "Nakit/Banka iadesi kaydedildi",
      paymentId: payment._id,
    });
  } catch (err) {
    console.error("REFUND PAYMENT ERROR:", err);
    return res.status(500).json({ message: "İade ödemesi yapılamadı" });
  }
}
