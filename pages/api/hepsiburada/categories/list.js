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

    const tokenObj = await getHBToken(cfg);
    const { parentId, leaf, page = 0, size = 500 } = req.query;

    // Tüm kategoriler veya alt kategoriler
    const url = parentId
      ? `${cfg.baseUrl}/product/api/categories/${parentId}/sub-categories`
      : `${cfg.baseUrl}/product/api/categories/get-all-categories`;

    const params = parentId ? {} : {
      leaf: leaf !== undefined ? leaf : "false",
      status: "ACTIVE",
      page,
      size,
    };

    const response = await axios.get(url, {
      params,
      headers: hbApiHeaders(cfg, tokenObj),
      timeout: 20000,
    });

    // Yanıt farklı formatlarda gelebilir
    const raw = response.data;
    const categories =
      raw?.categories ||
      raw?.data?.categories ||
      (Array.isArray(raw) ? raw : null) ||
      [];

    return res.json({ success: true, categories, total: raw?.totalElements || categories.length });
  } catch (err) {
    const detail = err?.response?.data;
    console.error("HB CATEGORY LIST ERROR:", JSON.stringify(detail || err.message));
    return res.status(500).json({
      success: false,
      message: detail?.description || detail?.errors?.[0] || detail?.message || err.message,
      detail,
    });
  }
}
