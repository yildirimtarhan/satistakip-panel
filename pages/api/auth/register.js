import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenir" });
  }

  try {
    await dbConnect();

    const { email, phone, password, ad, soyad } = req.body;

    // 📌 Gerekli alanlar
    if (!email || !phone || !password) {
      return res.status(400).json({
        message: "Email, telefon ve şifre zorunludur.",
      });
    }

    // 📌 Email temizle
    const cleanedEmail = email.toLowerCase();

    // 📌 Email zaten var mı?
    const emailExists = await User.findOne({ email: cleanedEmail });
    if (emailExists) {
      return res.status(400).json({ message: "Bu e-posta zaten kayıtlı." });
    }

    // 📌 Telefon zaten var mı?
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({
        message: "Bu telefon numarası zaten kayıtlı.",
      });
    }

    // 📌 Şifre hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // 📌 Yeni kullanıcı oluştur
    const newUser = await User.create({
      email: cleanedEmail,
      phone,
      password: hashedPassword,
      ad: ad || "",
      soyad: soyad || "",
      role: "user",
      approved: false, // ❗ Admin onayı ZORUNLU
      createdAt: new Date(),
    });

    return res.status(201).json({
      message: "Kayıt başarılı! Admin onayı sonrası giriş yapabilirsiniz.",
      userId: newUser._id,
    });

  } catch (error) {
    console.error("Register API Hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
