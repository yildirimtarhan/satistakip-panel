// pages/api/auth/login.js

import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST isteği kabul edilir." });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email ve şifre zorunludur." });
  }

  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Geçersiz e-posta veya şifre." });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Geçersiz e-posta veya şifre." });
    }

    const token = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({ message: "Giriş başarılı", token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
