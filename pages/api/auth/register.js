// 📁 /pages/api/auth/register.js
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  try {
    await dbConnect();

    const { email, phone, password, ad, soyad } = req.body;

    // 📌 Zorunlu alan kontrolü
    if (!password || (!email && !phone)) {
      return res.status(400).json({
        message: "Email veya telefon ve şifre gereklidir.",
      });
    }

    // 📌 Email veya Telefon zaten var mı?
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    }).lean();

    if (existingUser) {
      return res.status(400).json({
        message: "Bu email veya telefon ile zaten hesap oluşturulmuş.",
      });
    }

    // 🔒 Şifre hash
    const hashedPassword = await bcrypt.hash(password, 10);

    // 📌 Yeni kullanıcı oluştur
    const createdUser = await User.create({
      email: email || null,
      phone: phone || null,
      password: hashedPassword,
      ad: ad || "",
      soyad: soyad || "",
      role: "user",
      approved: false, // 🔥 Admin onayı gerekiyor!
      createdAt: new Date(),
    });

    return res.status(201).json({
      message:
        "Kayıt başarılı! Hesabınız admin tarafından onaylandıktan sonra giriş yapabilirsiniz.",
      userId: createdUser._id,
    });

  } catch (error) {
    console.error("Register API Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
