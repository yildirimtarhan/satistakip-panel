import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  try {
    await dbConnect();

    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res
        .status(400)
        .json({ message: "Email/Telefon ve şifre gereklidir" });
    }

    const cleanLoginId = String(loginId).trim();
    const digitsOnly = cleanLoginId.replace(/\D/g, "");

    let user = null;

    // 📌 Cep telefonu ile giriş: 10+ rakam varsa telefon kabul et (05xx, 5xx, +90 5xx vb.)
    if (digitsOnly.length >= 10) {
      const tenDigit = digitsOnly.slice(-10); // 5059112749
      const with0 = "0" + tenDigit;            // 05059112749
      const with90 = "90" + tenDigit;         // 905059112749
      const withPlus90 = "+90" + tenDigit;   // +905059112749
      const phoneVariants = [
        cleanLoginId,
        digitsOnly,
        tenDigit,
        with0,
        with90,
        withPlus90,
        "+90 " + tenDigit.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4"),
      ].filter(Boolean);
      user = await User.findOne({ phone: { $in: phoneVariants } }).lean();
    }

    // 📌 Email ile giriş
    if (!user) {
      user = await User.findOne({ email: cleanLoginId.toLowerCase() }).lean();
    }

    if (!user) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    // 🔐 Şifre kontrol
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Şifre hatalı" });
    }

    console.log("LOGIN USER:", {
  id: user._id,
  email: user.email,
  companyId: user.companyId,
});

    // 🛑 Admin onayı yoksa giriş yasak
    if (user.approved === false) {
      return res.status(403).json({
        message: "Hesabınız henüz admin tarafından onaylanmadı ❌",
      });
    }

    // 🔥 JWT oluştur (✅ Multi-tenant + role eklendi)
const token = jwt.sign(
  {
    userId: user._id.toString(),
    email: user.email,
    companyId: user.companyId?.toString(),
    role: user.role || "user", // 🔥 EKLENDİ
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);



    return res.status(200).json({
      message: "Giriş başarılı",
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        approved: user.approved,
        companyId: user.companyId || null, // ✅ debug için iyi
      },
    });
  } catch (err) {
    console.error("Login API Hatası:", err);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
