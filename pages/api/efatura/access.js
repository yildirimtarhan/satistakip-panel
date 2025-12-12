// 📁 /pages/api/efatura/access.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET desteklenir" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded.userId || decoded.id || decoded._id;
    const userObjectId = new ObjectId(userId);

    const client = await clientPromise;
    const db = client.db("satistakip");
    const app = await db
      .collection("efatura_applications")
      .findOne({ userObjectId });

    if (!app) {
      return res.status(200).json({
        allowed: false,
        status: "none",
      });
    }

    return res.status(200).json({
      allowed: app.status === "approved",
      status: app.status,
    });
  } catch (err) {
    console.error("EFATURA ACCESS ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
