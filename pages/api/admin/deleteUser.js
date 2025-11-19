// 📁 /pages/api/admin/deleteUser.js
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  try {
    // 🔐 Admin token kontrolü
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

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    await dbConnect();

    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ message: "Kullanıcı id zorunlu" });
    }

    // İstersen: Admin kendi hesabını silmesin
    if (String(decoded.userId) === String(id)) {
      return res.status(400).json({ message: "Kendi hesabınızı silemezsiniz" });
    }

    const deleted = await User.findByIdAndDelete(id).lean();

    if (!deleted) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    return res.status(200).json({ message: "Kullanıcı silindi" });
  } catch (err) {
    console.error("Admin DeleteUser API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
