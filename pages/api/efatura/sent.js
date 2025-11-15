// 📁 /pages/api/efatura/sent.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("satistakip");
  const sent = db.collection("efatura_sent");

  try {
    // ============================
    // 📌 GET → Gönderilmiş Faturaları Listele
    // ============================
    if (req.method === "GET") {
      const list = await sent
        .find({})
        .sort({ sentAt: -1 })
        .toArray();

      return res.status(200).json(list);
    }

    // ============================
    // 📌 DELETE → Gönderilmiş Fatura Sil
    // /api/efatura/sent?id=<id>
    // ============================
    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: "id eksik" });
      }

      await sent.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ message: "Fatura silindi" });
    }

    return res
      .status(405)
      .json({ message: "Sadece GET ve DELETE desteklenir" });
  } catch (err) {
    console.error("📌 E-Fatura SENT API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
