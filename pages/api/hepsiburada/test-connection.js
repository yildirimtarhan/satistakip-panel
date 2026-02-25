import jwt from "jsonwebtoken";
import { getHBSettings, getHBToken } from "@/lib/marketplaces/hbService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.username || !cfg.password) {
      return res.status(400).json({
        success: false,
        message: "Hepsiburada ayarlari eksik. Once API Ayarlari sayfasini doldurun.",
      });
    }

    await getHBToken(cfg.username, cfg.password, cfg.testMode);

    return res.json({
      success: true,
      message: "Baglanti basarili!",
      testMode: cfg.testMode,
      merchantId: cfg.merchantId,
    });
  } catch (err) {
    const detail = err?.response?.data;
    return res.status(500).json({
      success: false,
      message: detail?.description || detail?.message || err.message,
      detail,
    });
  }
}
