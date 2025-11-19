// 📁 /pages/api/auth/refresh.js
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token bulunamadı" });
  }

  const oldToken = authHeader.split(" ")[1];

  try {
    // ❗ Süresi geçmiş olsa da decode edelim
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });

    if (!decoded?.userId) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // ✔ Yeni token üret
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Yeni token başarıyla oluşturuldu",
      token: newToken,
    });

  } catch (err) {
    console.error("Token yenileme hatası:", err);
    return res.status(401).json({ message: "Token yenileme başarısız" });
  }
}
