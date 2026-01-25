import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Cari from "@/models/Cari";
import N11Order from "@/models/N11Order";
import Transaction from "@/models/Transaction";
import mongoose from "mongoose";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const companyId = decoded.companyId || null;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "companyId bulunamadı" });
    }

    await dbConnect();

    const { orderNumber, cariId } = req.body || {};
    if (!orderNumber) {
      return res.status(400).json({ message: "orderNumber zorunlu" });
    }

    const order = await N11Order.findOne({ orderNumber, companyId });
    if (!order) return res.status(404).json({ message: "Sipariş bulunamadı" });

    let cari;

    // ✅ Eğer manuel cari seçilmişse
    if (cariId) {
      if (!mongoose.Types.ObjectId.isValid(cariId)) {
        return res.status(400).json({ message: "Geçersiz cariId" });
      }

      cari = await Cari.findOne({ _id: cariId, companyId });
      if (!cari) return res.status(404).json({ message: "Cari yok" });
    } else {
      // ✅ Otomatik cari bul/oluştur (RAW fallback)
      const raw = order.raw || {};
      const shipping = raw.shippingAddress || {};
      const billing = raw.billingAddress || {};

      const buyer = order.buyer || {};

      const fullName =
        buyer.fullName ||
        raw.customerfullName ||
        shipping.fullName ||
        billing.fullName ||
        "N11 Müşteri";

      const email = buyer.email || raw.customerEmail || "";
      const gsm = buyer.gsm || shipping.gsm || billing.gsm || "";

      // ✅ Cari ara (companyId ile)
      cari = await Cari.findOne({
        companyId,
        $or: [
          ...(email ? [{ email }] : []),
          ...(gsm ? [{ telefon: gsm }] : []),
          ...(fullName ? [{ ad: fullName }] : []),
        ],
      });

      // ✅ Yoksa oluştur
      if (!cari) {
        cari = await Cari.create({
          companyId,
          ad: fullName,
          email,
          telefon: gsm,

          vergiTipi: buyer.taxId ? "VKN" : "TCKN",
          vergiNo: buyer.taxId || "",

          il: order.shippingAddress?.city || shipping.city || billing.city || "",
          ilce:
            order.shippingAddress?.district ||
            shipping.district ||
            billing.district ||
            "",
          adres:
            order.shippingAddress?.address ||
            shipping.address ||
            billing.address ||
            "",

          userId,
        });
      }
    }

    // ✅ Siparişe cariyi bağla
    order.accountId = cari._id;
    order.userId = userId;
    order.companyId = companyId;
    await order.save();

    // ✅ Transaction toplamı fix
    const total =
      Number(order.totalPrice) ||
      Number(order.totalAmount) ||
      Number(order.raw?.totalAmount) ||
      0;

    await Transaction.create({
      companyId,
      userId,
      accountId: cari._id,
      type: "n11_sale",
      total,
      currency: "TRY",
      date: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Sipariş cari ile eşleşti",
      cariId: cari._id,
    });
  } catch (err) {
    console.log("🔥 Link cari error:", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: err?.message || String(err),
    });
  }
}
