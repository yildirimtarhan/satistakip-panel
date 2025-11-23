// 📁 /pages/api/cari/create.js
import dbConnect from "@/lib/mongodb";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST allowed" });
  }

  await dbConnect();

  const {
    ad,
    email,
    telefon,
    il,
    ilce,
    adres,
    kaynak = "N11",
    n11CustomerId, // 🔴 ÖNEMLİ: doğru alan adı
  } = req.body || {};

  if (!ad) {
    return res
      .status(400)
      .json({ success: false, message: "Ad zorunludur" });
  }

  const now = new Date();

  const cari = await Cari.create({
    ad,
    tur: "Müşteri",              // ✅ Liste filtresine takılmasın
    telefon,
    email,
    il,
    ilce,
    adres,
    n11CustomerId: n11CustomerId || null, // ✅ Modeldeki alan adı
    kaynak,
    paraBirimi: "TRY",
    balance: 0,
    totalSales: 0,
    totalPurchases: 0,
    createdAt: now,
    updatedAt: now,
  });

  return res.status(200).json({
    success: true,
    message: "Cari başarıyla oluşturuldu",
    cari: JSON.parse(JSON.stringify(cari)),
  });
}
