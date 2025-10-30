import cloudinary from "cloudinary";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.log("Upload error:", err);
      return res.status(500).json({ error: "File parse error" });
    }

    const file = files.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const upload = await cloudinary.v2.uploader.upload(file.filepath, {
        folder: "satistakip_products",
      });

      fs.unlinkSync(file.filepath); // Temp dosyayı sil

      return res.status(200).json({
        message: "✅ Upload successful",
        url: upload.secure_url,
      });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ error: "Cloudinary upload failed" });
    }
  });
}
