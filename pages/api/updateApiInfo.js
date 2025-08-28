import dbConnect from "../../lib/mongodb";
import User from "../../models/User";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteğine izin verilir" });
  }

  try {
    await dbConnect();

    // Header’dan token al
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token bulunamadı" });
    }

    // Token doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { trendyol, hepsiburada } = req.body;

    // Kullanıcının bilgilerini güncelle
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          trendyol,
          hepsiburada,
        },
      },
      { new: true }
    );

    return res.status(200).json({
      message: "API bilgileri güncellendi",
      user: updatedUser,
    });
  } catch (error) {
    console.error("updateApiInfo hata:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
