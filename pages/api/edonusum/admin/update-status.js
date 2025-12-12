// 📁 /pages/api/edonusum/admin/update-status.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  try {
    await dbConnect();

    // Token kontrolü
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // ❗ Sadece admin işlem yapabilir
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const { id, status, adminNote } = req.body;

    if (!id || !status) {
      return res.status(400).json({ message: "Eksik parametre" });
    }

    const client = await dbConnect();
    const db = client.connection.db;
    const col = db.collection("edonusum_applications");

    await col.updateOne(
      { _id: id },
      {
        $set: {
          status,
          adminNote: adminNote || "",
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Admin Update Error:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
