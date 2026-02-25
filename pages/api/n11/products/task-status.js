import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";
import { n11GetTaskStatus } from "@/lib/marketplaces/n11Service";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });

  try {
    await dbConnect();

    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const { productId, taskId: queryTaskId } = req.query;

    let taskId = queryTaskId;

    // productId ile taskId bul
    if (productId && !taskId) {
      const product = await Product.findOne({
        _id: productId,
        ...(companyId ? { $or: [{ companyId }, { userId }] } : { userId }),
      });

      if (!product) {
        return res.status(404).json({ success: false, message: "Ürün bulunamadı" });
      }

      // create.js hem n11TaskId hem marketplaceSettings.n11.lastTaskId'ye yazıyor
      taskId =
        product.n11TaskId ||
        product.marketplaceSettings?.n11?.lastTaskId ||
        product.marketplaceSettings?.n11?.taskId;

      if (!taskId) {
        return res.status(404).json({ success: false, message: "Task ID bulunamadı" });
      }
    }

    if (!taskId) {
      return res.status(400).json({ success: false, message: "productId veya taskId zorunlu" });
    }

    // N11 REST task status sorgu
    const taskResult = await n11GetTaskStatus({ companyId, userId, taskId });

    // productId varsa DB güncelle
    if (productId) {
      await Product.findOneAndUpdate(
        {
          _id: productId,
          ...(companyId ? { $or: [{ companyId }, { userId }] } : { userId }),
        },
        {
          $set: {
            n11TaskStatus: taskResult.status,
            "marketplaceSettings.n11.lastTaskStatus": taskResult.status,
            "marketplaceSettings.n11.lastCheckedAt": new Date(),
            "marketplaceSettings.n11.lastReason": taskResult.reason || "",
          },
        }
      );
    }

    return res.json({
      success: true,
      taskId,
      status: taskResult.status,
      reason: taskResult.reason,
      raw: taskResult.raw,
    });
  } catch (err) {
    console.error("TASK STATUS ERROR:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
