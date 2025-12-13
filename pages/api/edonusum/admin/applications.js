// 📁 /pages/api/edonusum/admin/applications.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // 🔐 Token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const conn = await dbConnect();
    const db = conn.connection.db;
    const col = db.collection("edonusum_applications");

    // 📌 GET → Liste
    if (req.method === "GET") {
      const list = await col.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json({ success: true, items: list });
    }

    // 📌 PUT → Onay / Red
    if (req.method === "PUT") {
      const { id, status, adminNote } = req.body;

      if (!id || !status) {
        return res.status(400).json({ message: "id ve status zorunlu" });
      }

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

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: "Method desteklenmiyor" });
  } catch (err) {
    console.error("Admin applications API error:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
