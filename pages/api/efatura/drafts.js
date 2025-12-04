// 📁 /pages/api/efatura/drafts.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const col = db.collection("efatura_drafts");

    // 🔐 Kullanıcı doğrulama
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token eksik" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token geçersiz" });
    }

    const userId = decoded.userId;

    // 📌 1) TASLAK OLUŞTURMA (POST)
    if (req.method === "POST") {
      const body = req.body || {};
      const {
        customer,
        items = [],
        notes = "",
        invoiceType = "EARSIV",
        totals = {},
      } = body;

      if (!customer || !customer.title) {
        return res.status(400).json({ message: "Müşteri bilgisi eksik" });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "En az bir ürün eklemelisiniz" });
      }

      const uuid = `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const draft = {
        userId,
        uuid,
        invoiceType,
        customer,
        items,
        notes,
        totals,
        createdAt: new Date(),
      };

      await col.insertOne(draft);

      return res.status(200).json({
        message: "Taslak oluşturuldu",
        draft,
      });
    }

    // 📌 2) TÜM TASLAKLARI GETİR
    if (req.method === "GET") {
      const drafts = await col
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(drafts);
    }

    // 📌 3) TASLAK SİL (DELETE)
    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: "ID eksik" });
      }

      await col.deleteOne({
        _id: new ObjectId(id),
        userId,
      });

      return res.json({ message: "Taslak silindi" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("DRAFT ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
