import dbConnect from "@/lib/mongodb";
import Teklif from "@/models/Teklif";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "id gerekli" });

    const teklif = await Teklif.findById(id).lean();
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    return res.status(200).json({ teklif });
  } catch (err) {
    console.error("VIEW ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
