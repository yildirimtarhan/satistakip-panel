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

    const fullName = `${ad || ""} ${soyad || ""}`.trim();

    // Aynı firmada email veya telefon eşleşmesi ara
    let cari = await Cari.findOne({
      companyId: keyDoc.companyId,
      $or: [
        { email: email || "" },
        ...(phone ? [{ telefon: phone }] : []),
      ],
    });

    // Eğer cari yoksa oluştur
    if (!cari) {
      cari = await Cari.create({
        companyId: keyDoc.companyId,
        ad: fullName || "Web Müşteri",
        email: email || "",
        telefon: phone || "",
        adres: adres || "",
        tur: "Müşteri",
      });
    } else {
      // İsim boşsa güncelle
      if (!cari.ad || cari.ad.trim() === "") {
        cari.ad = fullName || cari.ad;
      }

      // Eksik alanları tamamla (var olanı ezme)
      if (!cari.telefon && phone) cari.telefon = phone;
      if (!cari.adres && adres) cari.adres = adres;

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