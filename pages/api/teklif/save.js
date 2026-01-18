import jwt from "jsonwebtoken";
import dbConnect from "../../../lib/dbConnect";
import Teklif from "../../../models/Teklif";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token yok" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { teklifId, pdfBase64, fileName } = req.body;

    if (!teklifId) return res.status(400).json({ message: "teklifId gerekli" });
    if (!pdfBase64) return res.status(400).json({ message: "pdfBase64 gerekli" });

    const teklif = await Teklif.findOne({ _id: teklifId, userId: decoded.userId });
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    // ✅ burada istersen dosyayı diske kaydedebilirsin (şimdilik DB'de base64 tutuyoruz)
    teklif.pdfBase64 = pdfBase64;
    teklif.fileName = fileName || teklif.fileName || `Teklif-${teklif.number || teklif._id}.pdf`;

    // ✅ pdfUrl yarat (online olunca burası domain olacak)
    const baseUrl =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";


    teklif.pdfUrl = `${baseUrl}/api/teklif/view?id=${teklif._id}`;

    teklif.status = "pdf_yuklendi";

    await teklif.save();

    return res.status(200).json({
      message: "PDF kaydedildi",
      teklifId: teklif._id,
      pdfUrl: teklif.pdfUrl,
      teklif,
    });
  } catch (err) {
    console.error("❌ /api/teklif/save hata:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
