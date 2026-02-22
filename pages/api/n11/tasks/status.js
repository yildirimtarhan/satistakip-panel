import { verifyToken } from "@/lib/auth";
import { n11GetTaskStatus } from "@/lib/marketplaces/n11Service";

export default async function handler(req, res) {
  try {
    await verifyToken(req);

    const { taskId } = req.query;
    if (!taskId) {
      return res.status(400).json({ success: false, message: "taskId gerekli" });
    }

    const result = await n11GetTaskStatus(req, taskId);

    res.json({
      success: true,
      status: result?.status || "UNKNOWN",
      reason: result?.reasons || [],
      raw: result,
    });
  } catch (err) {
    console.error("TASK STATUS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
