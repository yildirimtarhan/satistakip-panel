// pages/api/teklif/view.js
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: "Teklif ID eksik" });
    }

    const { db } = await connectToDatabase();
    const teklifler = db.collection("teklifler");

    const teklif = await teklifler.findOne({ _id: id });

    if (!teklif) {
      return res.status(404).json({ message: "Teklif bulunamadı" });
    }

    // 🌐 Cloudinary linki (artık disk yok, direkt URL döner)
    const pdfUrl = teklif.pdfUrl || null;

    return res.status(200).json({
      success: true,
      teklif,
      pdfUrl,
      message: "Teklif başarıyla getirildi"
    });

  } catch (err) {
    console.error("❌ Teklif görüntüleme hatası:", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: err.message
    });
  }
}
