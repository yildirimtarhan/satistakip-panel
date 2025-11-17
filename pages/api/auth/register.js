// 📁 /pages/api/auth/register.js
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email ve şifre gereklidir." });
  }

  try {
    await dbConnect();

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(400).json({ message: "Bu e-posta zaten kayıtlı." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await User.create({
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    return res.status(201).json({
      message: "Kayıt başarılı",
      userId: result._id,
    });
  } catch (error) {
    console.error("Register API Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
