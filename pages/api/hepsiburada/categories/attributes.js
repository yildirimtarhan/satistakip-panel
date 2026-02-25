import jwt from "jsonwebtoken";
import axios from "axios";
import { getHBSettings, getHBToken, hbBaseUrl } from "@/lib/marketplaces/hbService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.username || !cfg.password) {
      return res.status(400).json({ success: false, message: "Hepsiburada ayarlari eksik" });
    }

    const { categoryId } = req.query;
    if (!categoryId) return res.status(400).json({ success: false, message: "categoryId gerekli" });

    const hbToken = await getHBToken(cfg.username, cfg.password, cfg.testMode);
    const base = hbBaseUrl(cfg.testMode);

    const response = await axios.get(
      `${base}/product/api/categories/${categoryId}/attributes`,
      {
        headers: { Authorization: `Bearer ${hbToken}`, "Content-Type": "application/json" },
        timeout: 15000,
      }
    );

    const attributes = response.data?.categoryAttributes || response.data?.attributes || response.data || [];
    return res.json({ success: true, attributes });
  } catch (err) {
    const detail = err?.response?.data;
    return res.status(500).json({
      success: false,
      message: detail?.description || detail?.message || err.message,
      detail,
    });
  }
}
