import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const products = await Product.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    console.error("PRODUCT LIST ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Ürünler getirilemedi.",
    });
  }
}
