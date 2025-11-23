// 📁 /pages/api/cari/link-order.js
import dbConnect from "@/lib/mongodb";
import Cari from "@/models/Cari";
import N11Order from "@/models/N11Order";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST" });
  }

  const { orderNumber, cariId } = req.body || {};

  if (!orderNumber || !cariId) {
    return res.status(400).json({
      success: false,
      message: "orderNumber ve cariId zorunludur",
    });
  }

  await dbConnect();

  const cari = await Cari.findById(cariId);
  if (!cari) {
    return res.status(404).json({
      success: false,
      message: "Cari bulunamadı",
    });
  }

  const order = await N11Order.findOne({ orderNumber });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Sipariş bulunamadı",
    });
  }

  // 🔗 Siparişe cari bağla
  order.accountId = cari._id;
  await order.save();

  // 💰 Cari hareketi kaydı (basit N11 satış hareketi)
  const total =
    Number(order.totalPrice) ||
    Number(order.raw?.totalAmount?.value || 0) ||
    0;

  const date = order.raw?.createDate
    ? new Date(order.raw.createDate)
    : new Date();

  await Transaction.create({
    accountId: cari._id,
    productId: null,
    type: "n11_sale",
    quantity: 1,
    unitPrice: total,
    total: total,
    currency: "TRY",
    fxRate: 1,
    totalTRY: total,
    varyant: "N11 siparişi",
    date,
  });

  return res.status(200).json({
    success: true,
    message: "Sipariş başarıyla cari ile eşleştirildi",
    cari: {
      _id: cari._id.toString(),
      ad: cari.ad,
      telefon: cari.telefon,
      email: cari.email,
    },
  });
}
