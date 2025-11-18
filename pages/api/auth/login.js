import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  try {
    const { db } = await connectToDatabase();
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email ve şifre gereklidir" });

    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Şifre hatalı" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Giriş başarılı",
      token,
      user: {
        id: user._id,
        email: user.email
      }
    });

  } catch (err) {
    console.error("Login API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
