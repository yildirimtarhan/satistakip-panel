import dbConnect from "@/lib/mongodb";
import N11Category from "@/models/N11Category";

export default async function handler(req, res) {
  await dbConnect();

  try {
    const categories = await N11Category.find().sort({ fullPath: 1 });

    return res.json({
      success: true,
      categories,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
