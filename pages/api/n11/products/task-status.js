import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";
import { getN11TaskStatus } from "@/lib/marketplaces/n11Service";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false });
  }

  try {
    await dbConnect();

    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    const { productId } = req.query;
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId zorunlu",
      });
    }

    const product = await Product.findOne({ _id: productId, companyId });
    if (!product?.marketplaceSettings?.n11?.lastTaskId) {
      return res.status(404).json({
        success: false,
        message: "Task bulunamadı",
      });
    }

    const taskId = product.marketplaceSettings.n11.lastTaskId;

    /* ===== N11 SOAP TASK STATUS ===== */
    const taskResult = await getN11TaskStatus({
      taskId,
      req,
    });

    const status = taskResult?.status;
    const errors = taskResult?.errors || [];

    /* ===== DB UPDATE ===== */
    product.marketplaceSettings.n11.lastTaskStatus = status;
    product.marketplaceSettings.n11.lastErrors = errors;
    product.marketplaceSettings.n11.lastCheckedAt = new Date();

    await product.save();

    return res.json({
      success: true,
      status,
      errors,
    });
  } catch (err) {
    console.error("TASK STATUS ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
