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
  await dbConnect();

  // 1️⃣ Siparişi çek
  const order = await N11Order.findOne({ orderNumber });
  if (!order) {
    return res.status(404).json({ success: false, message: "Sipariş bulunamadı" });
  }

  // Eğer manuel cari seçilmişse → direkt eşleştir
  if (cariId) {
    const cari = await Cari.findById(cariId);
    if (!cari) {
      return res.status(404).json({ success: false, message: "Cari bulunamadı" });
    }

    order.accountId = cari._id;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Sipariş başarıyla cari ile eşleştirildi (manuel)"
    });
  }

  // 2️⃣ OTOMATİK CARİ OLUŞTURMA
  const buyer = order.buyer || {};
  const addr = order.shippingAddress || {};

  // Aynı email veya aynı ad-soyad varsa → mevcut cariyi bul
  let cari = await Cari.findOne({
    $or: [
      { email: buyer.email || "" },
      { ad: buyer.fullName || "" }
    ]
  });

  // Yoksa yeni cari oluştur
  if (!cari) {
    cari = await Cari.create({
      ad: buyer.fullName || "N11 Müşteri",
      tur: "Müşteri",
      telefon: buyer.gsm || "",
      email: buyer.email || "",
      vergiTipi: "TCKN",
      vergiNo: buyer.tckn || "",
      adres: addr.fullAddress?.address || "",
      il: addr.city || "",
      ilce: addr.fullAddress?.district || "",
      n11CustomerId: buyer.id || "",
      bakiye: 0
    });
  }

  // 3️⃣ Sipariş → Cari bağlantısı
  order.accountId = cari._id;
  await order.save();

  // 4️⃣ Cari hareketi (N11 satışı)
  const total =
    Number(order.totalPrice) ||
    Number(order.raw?.totalAmount?.value || 0) ||
    0;

  await Transaction.create({
    accountId: cari._id,
    type: "n11_sale",
    quantity: 1,
    unitPrice: total,
    total: total,
    currency: "TRY",
    totalTRY: total,
    date: new Date(),
    varyant: "N11 Siparişi"
  });

  return res.status(200).json({
    success: true,
    message: "Sipariş cari ile otomatik eşleştirildi",
    cariId: cari._id
  });
}
