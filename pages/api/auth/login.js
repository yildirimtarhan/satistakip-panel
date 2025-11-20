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

    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: "Email/Telefon ve şifre gereklidir" });
    }

    let user = null;

    // 📌 Telefon ile giriş mi?
    if (loginId.startsWith("+90") || loginId.replace(/\D/g, "").length >= 10) {
      user = await User.findOne({ phone: loginId }).lean();
    }

    // 📌 Email ile giriş mi?
    if (!user) {
      user = await User.findOne({ email: loginId.toLowerCase() }).lean();
    }

    if (!user) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    // 🔐 Şifre kontrol
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Şifre hatalı" });
    }

    // 🛑 Admin onayı yoksa giriş yasak
    if (user.approved === false) {
      return res.status(403).json({
        message: "Hesabınız henüz admin tarafından onaylanmadı ❌",
      });
    }

    // 🔥 JWT oluştur
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
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
