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
    const { parentId, leaf = "false", page = 0, size = 200, search } = req.query;

    let url, params;

    if (parentId) {
      url = `${cfg.baseUrl}/product/api/categories/${parentId}/sub-categories`;
      params = {};
    } else {
      url = `${cfg.baseUrl}/product/api/categories/get-all-categories`;
      params = { leaf, status: "ACTIVE", available: true, page, size };
    }

    const response = await axios.get(url, {
      params,
      headers: hbApiHeaders(cfg, tokenObj),
      timeout: 20000,
    });

    const raw = response.data;
    // HB yanit yapisi: { success, data: [...], totalElements, ... }
    let categories = raw?.data || raw?.categories || (Array.isArray(raw) ? raw : []);

    // Client-side search filtrele
    if (search && search.length >= 2) {
      const q = search.toLowerCase();
      categories = categories.filter((c) =>
        (c.name || c.displayName || "").toLowerCase().includes(q) ||
        (c.paths || []).some((p) => p.toLowerCase().includes(q))
      );
    }

    // Normalise: id ve name alanlarini standartlastir
    const normalized = categories.map((c) => ({
      id: c.categoryId || c.id,
      name: c.name || c.displayName || c.categoryName,
      path: c.paths ? c.paths.join(" > ") : "",
      leaf: c.leaf ?? false,
      parentId: c.parentCategoryId,
    }));

    return res.json({
      success: true,
      categories: normalized,
      total: raw?.totalElements || normalized.length,
      page: Number(page),
      size: Number(size),
    });
  } catch (err) {
    const detail = err?.response?.data;
    console.error("HB CATEGORY LIST ERROR:", JSON.stringify(detail || err.message));
    return res.status(500).json({
      success: false,
      message: detail?.description || detail?.message || err.message,
      detail,
    });
  }
}
