// 📁 /pages/api/efatura/mukellef-sorgu.js – Mükellef sorgulama (GİB / entegratör bağlandığında doldurulacak)
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    jwt.verify(token, process.env.JWT_SECRET);

    const { vknTckn } = req.body || {};
    const num = String(vknTckn || "").replace(/\D/g, "");
    if (num.length !== 10 && num.length !== 11) {
      return res.status(400).json({ message: "VKN 10 veya TCKN 11 haneli olmalıdır." });
    }

    // TODO: GİB veya Taxten vb. entegratör ile mükellef sorgulama
    // Şimdilik kayıt bulunamadı döndür (entegratör eklenince gerçek sorgu yapılacak)
    return res.status(200).json({
      message: "Entegratör bağlı değil; gerçek sorgu eklenince doldurulacak.",
      vkn: num.length === 10 ? num : undefined,
      tckn: num.length === 11 ? num : undefined,
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Geçersiz token" });
    }
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
