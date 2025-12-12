// 📁 /pages/api/edonusum/admin/applications.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // 🔐 Token kontrolü
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) return res.status(401).json({ message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // 🔥 Sadece admin yetkili
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const conn = await dbConnect();
    const db = conn.connection.db;
    const col = db.collection("edonusum_applications");

    // ============================
    // 📌 1) GET — Başvuruları listele
    // ============================
    if (req.method === "GET") {
      const list = await col
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({ success: true, applications: list });
    }

    // ============================
    // 📌 2) PUT — Başvuru Güncelle (onay / red)
    // ============================
    if (req.method === "PUT") {
      const { id, status, adminNote } = req.body;

      if (!id || !status) {
        return res.status(400).json({ message: "id ve status gerekli" });
      }

      const allowed = ["approved", "rejected", "pending"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Geçersiz status" });
      }

      await col.updateOne(
        { _id: new require("mongodb").ObjectId(id) },
        {
          $set: {
            status,
            adminNote: adminNote || "",
            updatedAt: new Date(),
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: "Başvuru güncellendi",
      });
    }

    // ============================
    // 📌 3) DELETE — Başvuru Sil
    // ============================
    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) return res.status(400).json({ message: "id gerekli" });

      await col.deleteOne({ _id: new require("mongodb").ObjectId(id) });

      return res.status(200).json({
        success: true,
        message: "Başvuru silindi",
      });
    }

    return res.status(405).json({ message: "Method desteklenmiyor" });

  } catch (err) {
    console.error("Admin Başvuru Onay API Hatası:", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
    });
  }
}
