import { ObjectId } from "mongodb";
import { getTeklifCollection } from "@/models/Teklif";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ message: "Only POST" });
    const { id, status } = req.body || {};
    if (!id || !status) return res.status(400).json({ message: "id ve status gerekli" });

    const valid = ["Beklemede", "Bekliyor", "Gönderildi", "Onaylandı", "Reddedildi"];
    const next = valid.includes(status) ? status : "Bekliyor";

    const col = await getTeklifCollection();
    const r = await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: next, updatedAt: new Date() } }
    );

    if (!r.matchedCount) return res.status(404).json({ message: "Teklif bulunamadı" });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("status error:", e);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
