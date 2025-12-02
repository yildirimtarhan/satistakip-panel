import dbConnect from "@/lib/mongodb";
import N11Brand from "@/models/N11Brand";

export default async function handler(req, res) {
  await dbConnect();

  try {
    const brands = await N11Brand.find().sort({ name: 1 });

    return res.json({
      success: true,
      brands,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
