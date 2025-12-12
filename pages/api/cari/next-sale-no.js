// 📄 /pages/api/cari/next-sale-no.js
// Amaç: SAT-2025-000001 formatında sıradaki satış numarasını üretmek

import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST is allowed" });
  }

  try {
    // 🔐 Token kontrol
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Token bulunamadı" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const userId = decoded.userId || decoded._id;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const year = new Date().getFullYear();

    // 🔢 counters koleksiyonunda, her kullanıcı + yıl için ayrı sayaç
    const result = await db.collection("counters").findOneAndUpdate(
      { key: "sale", year, userId },
      {
        $inc: { seq: 1 },
        $setOnInsert: {
          key: "sale",
          year,
          userId,
          createdAt: new Date(),
        },
        $set: { updatedAt: new Date() },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    const seq = result.value?.seq || 1;

    // 🎫 SAT-2025-000001 formatı
    const saleNo = `SAT-${year}-${String(seq).padStart(6, "0")}`;

    return res.status(200).json({
      success: true,
      saleNo,
      year,
      seq,
    });
  } catch (err) {
    console.error("next-sale-no error:", err);
    return res.status(500).json({
      success: false,
      message: "Satış numarası üretilemedi",
    });
  }
}
