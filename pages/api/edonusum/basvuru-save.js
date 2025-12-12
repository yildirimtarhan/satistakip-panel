// 📁 /pages/api/edonusum/basvuru-save.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: "Sadece POST istekleri destekleniyor" });
  }

  try {
    // 🔐 Token kontrolü
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded.id || decoded._id;

    // 🧩 Body verileri
    const {
      modules,
      packageType,
      contactName,
      contactPhone,
      contactEmail,
      note,
    } = req.body;

    // 📌 DB
    const client = await dbConnect();
    const db = client.connection.db;
    const col = db.collection("edonusum_applications");

    // 📌 Başvuru oluştur
    const application = {
      userId,
      modules,
      packageType,
      contactName,
      contactPhone,
      contactEmail,
      note,
      status: "pending", // admin onay bekliyor
      adminNote: "",
      createdAt: new Date(),
    };

    const result = await col.insertOne(application);

    return res.status(200).json({
      success: true,
      message: "Başvuru başarıyla kaydedildi",
      applicationId: result.insertedId,
    });
  } catch (err) {
    console.error("Başvuru Save API Hatası:", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası oluştu",
    });
  }
}
