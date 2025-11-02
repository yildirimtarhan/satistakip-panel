// 📁 /pages/api/settings/company.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const col = db.collection("company_settings");

    // ✅ Kullanıcı kimdir? (token'dan alacağız ileride)
    const userId = "global"; // şimdilik sabit, SaaS user yapısında değişecek

    if (req.method === "GET") {
      const data = await col.findOne({ userId });
      return res.status(200).json(data || {});
    }

    if (req.method === "POST") {
      const body = req.body || {};

      await col.updateOne(
        { userId },
        { $set: { ...body, userId, updatedAt: new Date() } },
        { upsert: true }
      );

      return res.status(200).json({ message: "✅ Firma bilgileri kaydedildi" });
    }

    return res.status(405).json({ message: "Method yok" });
  } catch (err) {
    console.log("company settings error:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
