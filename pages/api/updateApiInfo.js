import dbConnect from "../../../lib/mongodb";
import User from "../../../models/User";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST metodu destekleniyor" });
  }

  await dbConnect();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Yetkilendirme yok" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { hepsiburada, trendyol } = req.body;

    await User.findByIdAndUpdate(userId, { hepsiburada, trendyol });

    res.status(200).json({ message: "API bilgileri güncellendi" });
  } catch (err) {
    console.error("API bilgisi güncelleme hatası:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
}
