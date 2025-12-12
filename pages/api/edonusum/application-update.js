import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    await dbConnect();

    // 🔐 Token kontrol
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // ❗ Sadece admin
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz işlem" });
    }

    const { id, status, adminNote = "" } = req.body;

    if (!id || !status) {
      return res.status(400).json({ message: "Eksik parametre" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Geçersiz durum" });
    }

    const db = (await dbConnect()).connection.db;
    const col = db.collection("edonusum_applications");

    const app = await col.findOne({ _id: new ObjectId(id) });
    if (!app) {
      return res.status(404).json({ message: "Başvuru bulunamadı" });
    }

    // 🔄 Güncelle
    await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          adminNote,
          approvedAt: status === "approved" ? new Date() : null,
          updatedAt: new Date(),
        },
      }
    );

    // 🔔 (SONRAKİ ADIM)
    // status === "approved" → Taxten API hesap açma + mail tetiklenecek

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Başvuru onaylandı"
          : "Başvuru reddedildi",
    });
  } catch (err) {
    console.error("Application Update Error:", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
    });
  }
}
