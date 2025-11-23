import dbConnect from "@/lib/mongodb";
import N11Order from "@/models/N11Order";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST supported" });
  }

  const { orderNumber } = req.body || {};

  if (!orderNumber) {
    return res
      .status(400)
      .json({ success: false, message: "orderNumber zorunludur" });
  }

  try {
    await dbConnect();

    let order = await N11Order.findOne({ orderNumber });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Sipariş bulunamadı" });
    }

    // Eğer zaten cari ile eşleştirilmişse
    if (order.cariId) {
      const existingCari = await Cari.findById(order.cariId).lean();
      return res.status(200).json({
        success: true,
        message: "Sipariş zaten cari ile eşleştirilmiş.",
        cari: existingCari || null,
      });
    }

    const buyer = order.buyer || {};
    const addr = order.shippingAddress || {};

    const phone = (buyer.gsm || buyer.phone || "").trim();
    const email = (buyer.email || "").trim();

    let cari = null;

    // Mevcut Cari arama (telefon / email ile)
    const orConds = [];
    if (phone) orConds.push({ telefon: phone });
    if (email) orConds.push({ email });

    if (orConds.length > 0) {
      cari = await Cari.findOne({ $or: orConds });
    }

    let created = false;
    if (!cari) {
      // 📌 Yeni Cari oluştur
      cari = new Cari({
        ad: buyer.fullName || buyer.name || "N11 Müşteri",
        tur: "Müşteri",
        telefon: phone || "",
        email: email || "",
        vergiTipi: "Bireysel",
        paraBirimi: "TRY",
        adres: addr.address || addr.fullAddress?.address || "",
        il: addr.city || "",
        ilce: addr.district || addr.fullAddress?.district || "",
        postaKodu: addr.postalCode || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await cari.save();
      created = true;
    }

    // Siparişi bu Cari’ye bağla
    order.cariId = cari._id;
    await order.save();

    return res.status(200).json({
      success: true,
      message: created
        ? "Yeni cari oluşturuldu ve siparişle eşleştirildi."
        : "Sipariş mevcut cari ile eşleştirildi.",
      cari: {
        _id: cari._id,
        ad: cari.ad,
        telefon: cari.telefon,
        email: cari.email,
      },
    });
  } catch (err) {
    console.error("Cari eşleştirme hatası:", err);
    return res.status(500).json({
      success: false,
      message: "Cari eşleştirme sırasında sunucu hatası.",
    });
  }
}
