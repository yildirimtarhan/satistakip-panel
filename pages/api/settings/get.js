import clientPromise from "../../../lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const client = await clientPromise;
    const db = client.db("satistakip");

    const settings = await db.collection("settings").findOne({ userId });

    if (!settings) {
      return res.status(200).json({ settings: null });
    }

    res.status(200).json({ settings });
  } catch (error) {
    console.error("API Ayarları getirme hatası:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
}
