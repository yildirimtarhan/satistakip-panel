// pages/api/auth/me.js
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token bulunamadı" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Geçersiz token formatı" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { db } = await connectToDatabase();
    const users = db.collection("users");

    // 🟢 Artık kullanıcıyı email ile doğruluyoruz
    const user = await users.findOne({ email: decoded.email });

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
