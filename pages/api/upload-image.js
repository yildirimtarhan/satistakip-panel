// ✅ /pages/api/upload-image.js
import cloudinary from "cloudinary";
import formidable from "formidable";
import fs from "fs/promises";

export const config = {
  api: { bodyParser: false },
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

  const form = formidable({
    maxFileSize: 5 * 1024 * 1024,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Parse error" });

    const file = files.file?.[0];
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const upload = await cloudinary.v2.uploader.upload(file.filepath, {
        folder: "satistakip_products",
      });

      await fs.unlink(file.filepath);

      return res.status(200).json({ url: upload.secure_url });
    } catch (e) {
      console.log("UPLOAD ERROR:", e);
      return res.status(500).json({ error: "Cloudinary upload failed" });
    }
  });
}
