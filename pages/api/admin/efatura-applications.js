// 📁 /pages/api/admin/efatura-applications.js
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  // Sadece admin
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ message: "Sadece GET ve POST destekleniyor" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token eksik" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz veya süresi dolmuş token" });
    }

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const adminUserId = decoded.userId || decoded._id || decoded.id;

    const { db } = await connectToDatabase();
    const col = db.collection("efatura_applications");

    // ==========================
    // 📌 GET → Tüm Başvurular
    // ?status=pending / approved / rejected opsiyonel
    // ==========================
    if (req.method === "GET") {
      const { status } = req.query;
      const filter = {};
      if (status) filter.status = status;

      const list = await col
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({ applications: list });
    }

    // ==========================
    // 📌 POST → Onay / Red
    // body: { id, status, adminNote }
    // ==========================
    if (req.method === "POST") {
      const { id, status, adminNote = "" } = req.body || {};

      if (!id || !["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ message: "id veya status hatalı" });
      }

      const _id = new ObjectId(id);

      const result = await col.findOneAndUpdate(
        { _id },
        {
          $set: {
            status,
            adminNote,
            adminUserId: String(adminUserId),
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      if (!result.value) {
        return res.status(404).json({ message: "Başvuru bulunamadı" });
      }

      return res.status(200).json({
        message: "Başvuru güncellendi",
        application: result.value,
      });
    }
  } catch (err) {
    console.error("Admin E-Fatura Başvuru API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
