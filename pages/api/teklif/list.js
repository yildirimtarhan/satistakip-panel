// /pages/api/teklif/list.js
import { getTeklifCollection } from "@/models/Teklif";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ message: "Only GET" });
    const teklifler = await getTeklifCollection();
    const list = await teklifler.find({}).sort({ createdAt: -1 }).limit(200).toArray();
    return res.status(200).json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
