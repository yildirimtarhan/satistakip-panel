import dbConnect from "@/lib/mongodb";
import Teklif from "@/models/Teklif";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { id } = req.query;
    if (!id) return res.status(400).json({ ok: false, message: "id gerekli" });

    const teklif = await Teklif.findById(id).lean();
    if (!teklif) return res.status(404).json({ ok: false, message: "Teklif bulunamadı" });

    return res.status(200).json({
      ok: true,
      teklif: {
        _id: teklif._id,
        number: teklif.number || "",
        cariUnvan: teklif.cariUnvan || "",
        genelToplam: teklif.genelToplam || 0,
        paraBirimi: teklif.paraBirimi || "TL",
        status: teklif.status || "",
        revisionNote: teklif.revisionNote || "",
        createdAt: teklif.createdAt,
      },
    });
  } catch (err) {
    console.error("public teklif error:", err);
    return res.status(500).json({ ok: false, message: "Sunucu hatası", error: err.message });
  }
}
