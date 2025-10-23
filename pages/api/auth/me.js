// pages/api/auth/me.js
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  // Authorization header kontrolü
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token bulunamadı" });
  }

  const token = authHeader.split(" ")[1]; // "Bearer TOKEN" formatından al
  if (!token) {
    return res.status(401).json({ message: "Geçersiz token formatı" });
  }

  try {
    // JWT doğrulama
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const client = await clientPromise;
    const db = client.db("satistakip");
    const users = db.collection("users");

    // Kullanıcıyı DB'den bul
    const user = await users.findOne({ _id: decoded.userId });
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

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
    return res.status(401).json({ message: "Token geçersiz veya süresi dolmuş" });
  }
}
