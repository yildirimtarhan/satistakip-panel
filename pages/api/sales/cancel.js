import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // 🔐 Auth
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    const user = verifyToken(token);

    if (!user?.userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const { saleNo } = req.body;
    if (!saleNo) {
      return res.status(400).json({ message: "saleNo zorunlu" });
    }

    // 🔎 Satış işlemlerini bul
    const sales = await Transaction.find({
      saleNo,
      type: "sale",
      isCancelled: { $ne: true },
      ...(user.companyId
        ? { companyId: user.companyId }
        : { userId: user.userId }),
    });

    if (!sales.length) {
      return res.status(404).json({ message: "İptal edilecek satış bulunamadı" });
    }

    // 🧾 Tahsilatları bul (satışa bağlı)
    const payments = await Transaction.find({
      saleNo,
      type: "payment",
      isCancelled: { $ne: true },
      ...(user.companyId
        ? { companyId: user.companyId }
        : { userId: user.userId }),
    });

    // 📦 STOK GERİ EKLE
    for (const sale of sales) {
      for (const item of sale.items || []) {
        if (!item.productId || !item.quantity) continue;

        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity },
        });
      }
    }

    // 🚫 SATIŞLARI İPTAL ET (BORÇ SİLİNİR)
    await Transaction.updateMany(
      { _id: { $in: sales.map((s) => s._id) } },
      {
        $set: {
          isCancelled: true,
          cancelledAt: new Date(),
          cancelledBy: user.userId,
        },
      }
    );

    // 🚫 TAHSİLATLARI DA İPTAL ET (ALACAK SİLİNİR)
    if (payments.length) {
      await Transaction.updateMany(
        { _id: { $in: payments.map((p) => p._id) } },
        {
          $set: {
            isCancelled: true,
            cancelledAt: new Date(),
            cancelledBy: user.userId,
          },
        }
      );
    }

    return res.status(200).json({
      message: "Satış ve bağlı tahsilatlar başarıyla iptal edildi",
      saleCount: sales.length,
      paymentCount: payments.length,
    });
  } catch (err) {
    console.error("SALE CANCEL ERROR:", err);
    return res.status(500).json({ message: "Satış iptal edilemedi" });
  }
}
