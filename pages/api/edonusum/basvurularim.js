// 📁 /pages/api/edonusum/basvurularim.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Application from "@/models/Application"; // birazdan modelini veriyorum

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

    const userId = decoded.id;

    // 🟧 Yalnızca GET
    if (req.method === "GET") {
      const list = await Application.find({ userId }).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, list });
    }

    return res.status(405).json({ message: "Method desteklenmiyor" });
  } catch (err) {
    console.error("Başvuru listeleme hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
