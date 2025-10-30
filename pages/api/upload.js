import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const result = await cloudinary.v2.uploader.upload_stream(
      { folder: "satistakip/products" },
      (error, uploadResult) => {
        if (error) return res.status(500).json({ error });
        return res.status(200).json({ url: uploadResult.secure_url });
      }
    );

    result.end(buffer);

  } catch (err) {
    console.error("Cloudinary Upload Error:", err);
    return res.status(500).json({ message: "Upload failed" });
  }
}
