import jwt from "jsonwebtoken";
import axios from "axios";
import { getHBSettings, getHBToken, buildAuthHeader } from "@/lib/marketplaces/hbService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId) return res.status(400).json({ success: false, message: "Hepsiburada ayarlari eksik" });

    const tokenObj = await getHBToken(cfg);
    const base = cfg.baseUrl;

    const { parentId } = req.query;
    const url = parentId
      ? `${base}/product/api/categories/${parentId}/sub-categories`
      : `${base}/product/api/categories/get-all-categories`;

    const response = await axios.get(url, {
      headers: { Authorization: buildAuthHeader(tokenObj), "Content-Type": "application/json" },
      timeout: 15000,
    });

    const categories = response.data?.categories || response.data || [];
    return res.json({ success: true, categories });
  } catch (err) {
    const detail = err?.response?.data;
    return res.status(500).json({
      success: false,
      message: detail?.description || detail?.message || err.message,
      detail,
    });
  }
}
