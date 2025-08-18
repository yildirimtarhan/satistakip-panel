import clientPromise from "../../../lib/mongodb";
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
    console.log("📡 MongoDB bağlanıyor...");
    const client = await clientPromise;
    console.log("✅ MongoDB bağlandı");

    const db = client.db("satistakip");
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      console.log("❌ Kullanıcı bulunamadı:", email);
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      console.log("❌ Şifre hatalı");
      return res.status(401).json({ message: "Geçersiz şifre" });
    }

    const token = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("✅ Giriş başarılı:", email);
    return res.status(200).json({ token });

  } catch (error) {
    console.error("🔥 Login API Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
