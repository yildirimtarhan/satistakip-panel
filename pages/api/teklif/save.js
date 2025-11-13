import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  try {
    const { fileName, pdfBase64 } = req.body || {};

    if (!fileName || !pdfBase64) {
      return res.status(400).json({ message: "fileName veya pdfBase64 eksik" });
    }

    // Base64 → Cloudinary upload
    const uploaded = await cloudinary.uploader.upload(`data:application/pdf;base64,${pdfBase64}`, {
      folder: "teklifler",
      resource_type: "raw",
      public_id: fileName.replace(".pdf", ""),
      overwrite: true,
    });

    return res.status(200).json({
      message: "PDF Cloudinary'ye kaydedildi",
      url: uploaded.secure_url,
    });
  } catch (err) {
    console.error("PDF upload hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
