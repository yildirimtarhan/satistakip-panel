// 📁 /pages/api/edonusum/applications.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // 🔐 Token kontrolü
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded.id || decoded._id;

    // 🔍 Kullanıcının kendi başvurularını çek
    const client = await dbConnect();
    const db = client.connection.db;
    const col = db.collection("edonusum_applications");

    const list = await col
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({ success: true, list });
  } catch (err) {
    console.error("Applications API Hatası:", err);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
}
