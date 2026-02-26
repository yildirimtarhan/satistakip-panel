import dbConnect from "@/lib/dbConnect";
import Cari from "@/models/Cari";
import { verifyApiKey } from "@/lib/verifyApiKey";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Sadece POST" });

  try {
    const keyDoc = await verifyApiKey(req);
    await dbConnect();

    const { ad, soyad, email, phone, adres } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email zorunlu" });

    // Ad Soyad birleştir
    const fullName = `${ad || ""} ${soyad || ""}`.trim();

    // Aynı firmada email veya telefon eşleşmesi ara
    let cari = await Cari.findOne({
      companyId: keyDoc.companyId,
      $or: [
        { email: email || "" },
        ...(phone ? [{ phone }] : []),
      ],
    });

    // Eğer cari yoksa oluştur
    if (!cari) {
      cari = await Cari.create({
        companyId: keyDoc.companyId,
        name: fullName || "Web Müşteri",
        email: email || "",
        phone: phone || "",
        address: adres || "",
        type: "customer",
      });
    } else {
      // İsim boşsa güncelle
      if (!cari.name || cari.name.trim() === "") {
        cari.name = fullName || cari.name;
      }

      // Eksik alanları tamamla (var olanı ezme)
      if (!cari.phone && phone) cari.phone = phone;
      if (!cari.address && adres) cari.address = adres;

      await cari.save();
    }

    return res.status(200).json({
      success: true,
      message: "Cari hazır",
      cariId: cari._id,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}