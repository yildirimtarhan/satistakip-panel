import dbConnect from "@/lib/mongodb";
import Cari from "@/models/Cari";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST allowed" });
  }

  await dbConnect();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Token gerekli" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Geçersiz token" });
  }

  const userId = decoded.userId;

  const {
    ad,
    email,
    telefon,
    il,
    ilce,
    adres,
    kaynak = "N11",
    n11CustomerId,
  } = req.body || {};

  if (!ad) {
    return res
      .status(400)
      .json({ success: false, message: "Ad zorunludur" });
  }

  const now = new Date();

  const cari = await Cari.create({
    ad,
    tur: "Müşteri",
    telefon,
    email,
    il,
    ilce,
    adres,
    n11CustomerId: n11CustomerId || null,
    kaynak,
    paraBirimi: "TRY",
    balance: 0,
    totalSales: 0,
    totalPurchases: 0,

    // 🟢 EKLENDİ — Multi Firma için kritik!
    userId,

    createdAt: now,
    updatedAt: now,
  });

  return res.status(200).json({
    success: true,
    message: "Cari başarıyla oluşturuldu",
    cari: JSON.parse(JSON.stringify(cari)),
  });
}
