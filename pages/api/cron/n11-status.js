// 📁 /pages/api/cron/n11-status.js
import { runN11StatusWatcher } from "@/lib/cron/productStatusWatcher";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, message: "Only GET allowed" });

  await runN11StatusWatcher();

  res.status(200).json({ success: true, message: "N11 status watcher ran." });
}
