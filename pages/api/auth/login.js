// pages/api/auth/login.js
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  const { email, password } = req.body;

  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const usersCollection = db.collection("users");

    // Kullanıcıyı bul
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Geçersiz e-posta veya şifre" });
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Geçersiz e-posta veya şifre" });
    }

    // Ortam değişkeni kontrolü
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET tanımlı değil!");
      return res.status(500).json({ message: "Sunucu yapılandırma hatası" });
    }

    // JWT oluştur (7 gün geçerli)
    const token = jwt.sign(
      {
        userId: user._id.toString(), // ObjectId string formatına çevrildi
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Başarılı yanıt
    return res.status(200).json({
      message: "Giriş başarılı ✅",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name || "",
      },
    });
  } catch (error) {
    console.error("Login API Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
