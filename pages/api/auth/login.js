// pages/api/auth/login.js

import dbConnect from "../../../lib/mongodb";
import User from "../../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST istekleri desteklenir" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email ve şifre zorunludur." });
  }

  try {
    // MongoDB bağlantısı
    await dbConnect();

    // Kullanıcıyı veritabanında ara
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    // Şifre kontrolü
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Geçersiz şifre" });
    }

    // JWT token üret
    const token = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Login API Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
