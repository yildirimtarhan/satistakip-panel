// 📁 /pages/api/auth/login.js
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  try {
    await dbConnect();

    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ message: "Email/Telefon ve şifre gereklidir" });
    }

    // 📌 Hem email hem telefon ile giriş desteği
    const query = emailOrPhone.includes("@")
      ? { email: emailOrPhone }
      : { phone: emailOrPhone };

    // 🔍 Kullanıcıyı bul
    const user = await User.findOne(query).lean();

    if (!user) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    // 🔒 Şifre kontrolü
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Şifre hatalı" });
    }

    // 🚫 Admin onayı kontrolü
    if (!user.approved) {
      return res.status(403).json({
        message: "Hesabınız henüz admin tarafından onaylanmadı ❌",
      });
    }

    // 🎫 JWT Token oluştur
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role || "user",
        approved: user.approved,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Giriş başarılı",
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        approved: user.approved,
      },
    });

  } catch (err) {
    console.error("Login API Hatası:", err);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
