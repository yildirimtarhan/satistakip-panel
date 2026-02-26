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

    let cari = await Cari.findOne({
      email,
      companyId: keyDoc.companyId,
    });

    if (!cari) {
      cari = await Cari.create({
        companyId: keyDoc.companyId,
        name: `${ad || ""} ${soyad || ""}`.trim(),
        email,
        phone: phone || "",
        address: adres || "",
        type: "customer",
      });
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