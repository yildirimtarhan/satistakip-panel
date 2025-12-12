// 📁 /pages/api/admin/edonusum/reject.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    // 🔐 Token kontrol
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz" });
    }

    const { id, adminNote } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Başvuru ID gerekli" });
    }

    // ✅ await artık handler içinde
    const conn = await dbConnect();
    const db = conn.connection.db;
    const col = db.collection("edonusum_applications");

    await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "rejected",
          adminNote: adminNote || "",
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Başvuru reddedildi",
    });
  } catch (err) {
    console.error("Reject API error:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
