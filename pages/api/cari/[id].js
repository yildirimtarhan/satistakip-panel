import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import Cari from "@/models/Cari";

export default async function handler(req, res) {
  const { id } = req.query;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Yetkisiz erişim" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    await dbConnect();

    let cariId;
    try {
      cariId = new Types.ObjectId(id);
    } catch {
      return res.status(400).json({ error: "Geçersiz cari ID" });
    }

    if (req.method === "PUT") {
      const updateData = req.body;
      await Cari.updateOne({ _id: cariId }, { $set: updateData });
      return res.status(200).json({ message: "Cari güncellendi ✅" });
    }

    if (req.method === "DELETE") {
      await Cari.deleteOne({ _id: cariId });
      return res.status(200).json({ message: "Cari silindi ❌" });
    }

    res.status(405).json({ error: "Geçersiz istek yöntemi" });

  } catch (err) {
    console.error("🔥 Cari tekil update/delete API hatası:", err);
    return res.status(401).json({ error: "Token hatalı veya süresi dolmuş" });
  }
}
