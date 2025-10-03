// pages/api/admin/users.js
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri destekleniyor." });
  }

  try {
    await dbConnect();
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    return res.status(200).json({ users });
  } catch (error) {
    console.error("Admin API Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
