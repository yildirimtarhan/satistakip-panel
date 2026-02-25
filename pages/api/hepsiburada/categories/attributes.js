import jwt from "jsonwebtoken";
import axios from "axios";
import { getHBSettings, getHBToken, hbApiHeaders } from "@/lib/marketplaces/hbService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.authToken) {
      return res.status(400).json({ success: false, message: "Hepsiburada ayarlari eksik" });
    }

    const { categoryId } = req.query;
    if (!categoryId) return res.status(400).json({ success: false, message: "categoryId gerekli" });

    const tokenObj = await getHBToken(cfg);

    const response = await axios.get(
      `${cfg.baseUrl}/product/api/categories/${categoryId}/attributes`,
      {
        headers: hbApiHeaders(cfg, tokenObj),
        timeout: 15000,
      }
    );

    const raw = response.data;
    const attributes =
      raw?.categoryAttributes ||
      raw?.attributes ||
      raw?.data?.attributes ||
      (Array.isArray(raw) ? raw : []);

    return res.json({ success: true, attributes });
  } catch (err) {
    const detail = err?.response?.data;
    console.error("HB ATTR ERROR:", JSON.stringify(detail || err.message));
    return res.status(500).json({
      success: false,
      message: detail?.description || detail?.message || err.message,
      detail,
    });
  }
}
