// pages/api/auth/login.js

import clientPromise from "@/lib/mongodb";
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
    const client = await clientPromise;
    const db = client.db("satistakip");

    // Kullanıcıyı bul
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    // Şifre karşılaştırması
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Geçersiz şifre" });
    }

    // JWT token oluştur
    const token = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Başarılı cevap
    return res.status(200).json({ token });

  } catch (error) {
    console.error("Login hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
