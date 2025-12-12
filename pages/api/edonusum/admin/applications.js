// 📁 /pages/api/edonusum/admin/applications.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // -----------------------------------
    // 🔐 Token & Admin Kontrolü
    // -----------------------------------
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Geçersiz token" });
    }

    // ❗ Sadece admin yetkili
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Yetkiniz yok" });
    }

    const client = await dbConnect();
    const db = client.connection.db;
    const col = db.collection("edonusum_applications");

    // -----------------------------------
    // 📌 GET → Başvuru listesini çek
    // -----------------------------------
    if (req.method === "GET") {
      const apps = await col
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({ success: true, applications: apps });
    }

    // -----------------------------------
    // 📌 PUT → Başvuru Onayla / Reddet
    // -----------------------------------
    if (req.method === "PUT") {
      const { id, status, adminNote } = req.body;

      if (!id || !status) {
        return res.status(400).json({
          success: false,
          message: "id ve status zorunlu",
        });
      }

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "status: approved | rejected olmalı",
        });
      }

      await col.updateOne(
        { _id: new require("mongodb").ObjectId(id) },
        {
          $set: {
            status,
            adminNote: adminNote || "",
            adminProcessedAt: new Date(),
            adminId: decoded.id,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: `Başvuru ${status === "approved" ? "onaylandı" : "reddedildi"}`,
      });
    }

    return res.status(405).json({ success: false, message: "Method desteklenmiyor" });
  } catch (err) {
    console.error("Admin Başvuru API Hatası:", err);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
}
