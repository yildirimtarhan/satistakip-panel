import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "POST gerekli" });
  }

  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Token gerekli" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Yetkisiz" });
    }

    const { id, status, adminNote } = req.body;
    if (!id || !status) {
      return res.status(400).json({ success: false, message: "Eksik veri" });
    }

    const client = await dbConnect();
    const db = client.connection.db;
    const col = db.collection("edonusum_applications");

    await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          adminNote: adminNote || "",
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Başvuru güncellendi",
    });
  } catch (err) {
    console.error("application-update error:", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
    });
  }
}
