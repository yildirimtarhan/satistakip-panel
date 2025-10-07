// pages/api/auth/reset-password.js

import dbConnect from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import User from "@/models/User";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST istekleri desteklenir" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "E-posta ve şifre zorunludur" });
  }

  try {
    // ✅ Mongoose bağlantısını aç
    await dbConnect();

    // 📌 Kullanıcıyı bul
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    // 🔐 Yeni şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10);

    // 📝 Şifreyi güncelle
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Şifre başarıyla güncellendi ✅" });
  } catch (error) {
    console.error("Şifre sıfırlama hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
