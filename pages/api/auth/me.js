// pages/api/auth/me.js
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token bulunamadı" });
  }

  const token = authHeader.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ message: "Geçersiz token formatı" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = await clientPromise;
    const db = client.db("satistakip");
    const users = db.collection("users");

    // 🟢 Dikkat: ObjectId dönüşümü burada çok kritik
    const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      console.warn("Kullanıcı bulunamadı:", decoded.userId);
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
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token süresi dolmuş" });
    }
    return res.status(401).json({ message: "Token geçersiz veya hatalı" });
  }
}
