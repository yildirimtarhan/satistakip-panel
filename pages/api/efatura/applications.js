// 📁 /pages/api/efatura/applications.js
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb"; // lib/mongodb.js içindeki helper

export default async function handler(req, res) {
  try {
    // 🔐 Token kontrolü
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
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz veya süresi dolmuş token" });
    }

    const userId = decoded.userId || decoded._id || decoded.id;

    const { db } = await connectToDatabase();
    const col = db.collection("efatura_applications");

    // ==========================
    // 📌 POST → Yeni Başvuru
    // ==========================
    if (req.method === "POST") {
      const {
        modules = {}, // { efatura: true, earsiv: true, eirsaliye: false }
        packageType = "standart",
        contactName = "",
        contactPhone = "",
        contactEmail = "",
        note = "",
      } = req.body || {};

      if (!modules.efatura && !modules.earsiv && !modules.eirsaliye) {
        return res.status(400).json({
          message: "En az bir modül seçmelisiniz (E-Fatura / E-Arşiv / E-İrsaliye)",
        });
      }

      const now = new Date();

      const doc = {
        userId: String(userId),
        companyId: decoded.companyId || null, // İleride çoklu firma için
        modules: {
          efatura: !!modules.efatura,
          earsiv: !!modules.earsiv,
          eirsaliye: !!modules.eirsaliye,
        },
        packageType,
        contact: {
          name: contactName,
          phone: contactPhone,
          email: contactEmail,
        },
        note,
        status: "pending", // pending | approved | rejected
        adminNote: "",
        adminUserId: null,
        createdAt: now,
        updatedAt: now,
      };

      const result = await col.insertOne(doc);

      return res.status(200).json({
        success: true,
        message: "Başvurunuz alındı. Yönetici onayından sonra aktif olacaktır.",
        applicationId: result.insertedId,
      });
    }

    // ==========================
    // 📌 GET → Başvurularım
    // ==========================
    if (req.method === "GET") {
      const apps = await col
        .find({ userId: String(userId) })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({ applications: apps });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("E-Fatura Başvuru API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
