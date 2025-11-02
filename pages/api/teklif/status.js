// /pages/api/teklif/status.js
import { ObjectId } from "mongodb";
import { getTeklifCollection } from "@/models/Teklif";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ message: "Only POST" });
    const { id, status } = req.body || {};
    if (!id || !status) return res.status(400).json({ message: "id ve status gerekli" });

    const allowed = ["Beklemede", "Gönderildi", "Onaylandı", "Reddedildi"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Geçersiz status" });

    const teklifler = await getTeklifCollection();
    await teklifler.updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: new Date() } });
    return res.status(200).json({ message: "Durum güncellendi" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
