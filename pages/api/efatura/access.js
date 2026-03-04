// 📁 /pages/api/efatura/access.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET desteklenir" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // Login JWT'de userId: user._id.toString() kullanılıyor
    const userId = decoded.userId || decoded.id || decoded._id;
    if (!userId) {
      return res.status(200).json({ allowed: false, status: "none" });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("efatura_applications");

    const userIdStr = String(userId);
    // Önce string ile ara (başvuru kaydı userId: String(userId) ile saklanıyor)
    let app = await col.findOne({ userId: userIdStr });

    // Bulunamazsa eski kayıtlar için ObjectId ile dene
    if (!app && /^[a-f0-9]{24}$/i.test(userIdStr)) {
      try {
        app = await col.findOne({ userId: new ObjectId(userIdStr) });
      } catch {
        // ObjectId geçersizse yok say
      }
    }

    if (!app) {
      return res.status(200).json({
        allowed: false,
        status: "none",
      });
    }

    return res.status(200).json({
      allowed: app.status === "approved",
      status: app.status || "pending",
    });
  } catch (err) {
    console.error("EFATURA ACCESS ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
