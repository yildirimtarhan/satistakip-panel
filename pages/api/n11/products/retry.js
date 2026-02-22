import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { n11CreateProduct } from "@/lib/marketplaces/n11Service";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ success: false });
  }

  try {
    await dbConnect();

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false });
    }

    // 🔁 tekrar gönder
    const result = await n11CreateProduct(req, product);

    return res.json({
      success: true,
      taskId: result?.taskId,
      message: "N11 tekrar gönderildi",
    });
  } catch (err) {
    console.error("N11 RETRY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
