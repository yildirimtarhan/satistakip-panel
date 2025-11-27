// /pages/api/n11/orders/link-cari.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Cari from "@/models/Cari";
import N11Order from "@/models/N11Order";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    await dbConnect();

    const { orderNumber, cariId } = req.body;

    const order = await N11Order.findOne({ orderNumber, userId });
    if (!order)
      return res.status(404).json({ message: "Sipariş bulunamadı" });

    let cari;

    if (cariId) {
      cari = await Cari.findById(cariId);
      if (!cari) return res.status(404).json({ message: "Cari yok" });
    } else {
      const buyer = order.buyer;
      cari = await Cari.findOne({
        userId,
        $or: [
          { email: buyer.email },
          { telefon: buyer.gsm },
          { ad: buyer.fullName },
        ],
      });

      if (!cari) {
        cari = await Cari.create({
          ad: buyer.fullName,
          email: buyer.email,
          telefon: buyer.gsm,
          vergiTipi: buyer.taxId ? "VKN" : "TCKN",
          vergiNo: buyer.taxId || "",
          il: order.shippingAddress.city,
          ilce: order.shippingAddress.district,
          adres: order.shippingAddress.address,
          userId,
        });
      }
    }

    // Bağla
    order.accountId = cari._id;
    await order.save();

    await Transaction.create({
      accountId: cari._id,
      type: "n11_sale",
      total: order.totalPrice,
      currency: "TRY",
      date: new Date(),
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Sipariş cari ile eşleşti",
      cariId: cari._id,
    });

  } catch (err) {
    console.log("🔥 Link cari error:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
