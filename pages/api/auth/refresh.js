// pages/api/auth/refresh.js
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token bulunamadı" });
  }

  const token = authHeader.split(" ")[1];
  try {
    // Eski token’ı doğrula ama süresi dolmuş olsa bile izin ver
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });

    // Yeni token oluştur (7 gün geçerli)
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Yeni token oluşturuldu ✅",
      token: newToken,
    });
  } catch (err) {
    console.error("Token yenileme hatası:", err);
    return res.status(401).json({ message: "Token yenileme başarısız" });
  }
}
