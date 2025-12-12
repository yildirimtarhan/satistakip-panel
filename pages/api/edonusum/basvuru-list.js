// 📁 /pages/api/edonusum/basvuru-list.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Sadece GET destekleniyor." });
  }

  try {
    await dbConnect();

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, message: "Token gerekli." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded._id;

    const { db } = await import("@/lib/mongodb").then((m) => m.connectToDatabase());

    const list = await db
      .collection("edonusum_basvurular")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({ success: true, list });
  } catch (err) {
    console.error("Başvuru listesi hatası:", err);
    return res.status(500).json({ success: false, message: "Sunucu hatası." });
  }
}
