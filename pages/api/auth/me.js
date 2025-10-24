// pages/api/auth/me.js
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  // Authorization header kontrolü
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token bulunamadı" });
  }

  // "Bearer TOKEN" formatından token'ı al
  const token = authHeader.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ message: "Geçersiz token formatı" });
  }

  try {
    // JWT doğrulama
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // MongoDB bağlantısı
    const client = await clientPromise;
    const db = client.db("satistakip");
    const users = db.collection("users");

    // userId'yi ObjectId'ye dönüştürerek kullanıcıyı bul
    const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    // Token geçerli ve kullanıcı bulundu 🎯
    return res.status(200).json({
      message: "Token geçerli ✅",
      user: {
        id: user._id,
        email: user.email,
        name: user.name || "",
      },
    });
  } catch (error) {
    console.error("Token doğrulama hatası:", error);
    // Hata türüne göre anlamlı mesaj döndür
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token süresi dolmuş" });
    }
    return res.status(401).json({ message: "Token geçersiz veya hatalı" });
  }
}
