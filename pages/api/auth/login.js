import clientPromise from "../../../lib/mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteği desteklenir" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "E-posta ve şifre gerekli" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const users = db.collection("users");

    const user = await users.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "E-posta bulunamadı" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Geçersiz şifre" });
    }

    // ✅ JWT Token oluştur
    const token = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // ✅ Cookie yerine JSON response içinde token dönüyoruz
    return res.status(200).json({ message: "Giriş başarılı", token });
  } catch (error) {
    console.error("Giriş hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
