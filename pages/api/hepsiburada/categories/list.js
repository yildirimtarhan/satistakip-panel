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
    const { parentId, leaf = "false", page = 0, size, search } = req.query;

    let url, params;
    const singlePageSize = Number(size) || 200;
    // Arama varken çok sayfa çek (telefon kılıfı vb. tüm katalogda aransın)
    const fetchAllWhenSearching = search && search.length >= 2;

    if (parentId) {
      url = `${cfg.baseUrl}/product/api/categories/${parentId}/sub-categories`;
      params = {};
    } else {
      url = `${cfg.baseUrl}/product/api/categories/get-all-categories`;
      params = { leaf, status: "ACTIVE", available: true, page: fetchAllWhenSearching ? 0 : page, size: singlePageSize };
      if (search && search.trim()) params.search = search.trim();
    }

    let categories = [];
    let totalFromApi;
    if (parentId || !fetchAllWhenSearching) {
      const response = await axios.get(url, { params, headers: hbApiHeaders(cfg, tokenObj), timeout: 25000 });
      const raw = response.data;
      categories = raw?.data || raw?.categories || (Array.isArray(raw) ? raw : []);
      totalFromApi = raw?.totalElements ?? categories.length;
    } else {
      // Arama: tüm sayfaları çek (HB genelde sayfa başı 100–200 limit)
      let totalElements = 9999;
      let currentPage = 0;
      const perPage = 200;
      while (categories.length < totalElements) {
        const res = await axios.get(url, {
          params: { ...params, page: currentPage, size: perPage },
          headers: hbApiHeaders(cfg, tokenObj),
          timeout: 25000,
        });
        const data = res.data?.data || res.data?.categories || (Array.isArray(res.data) ? res.data : []);
        categories = categories.concat(data);
        totalElements = res.data?.totalElements ?? categories.length;
        if (data.length < perPage || categories.length >= totalElements) break;
        currentPage++;
        if (currentPage > 50) break; // güvenlik limiti
      }
      totalFromApi = categories.length;
    }

    // Arama: HB search desteklemiyorsa client-side filtrele (path/name)
    if (search && search.length >= 2) {
      const q = search.toLowerCase().trim();
      categories = categories.filter((c) => {
        const name = (c.name || c.displayName || c.categoryName || "").toLowerCase();
        const pathStr = (c.paths && Array.isArray(c.paths) ? c.paths.join(" ") : (c.path || "")).toLowerCase();
        return name.includes(q) || pathStr.includes(q);
      });
    }

    // Normalise: id ve name alanlarini standartlastir (path: dizi veya string)
    const normalized = categories.map((c) => ({
      id: c.categoryId || c.id,
      name: c.name || c.displayName || c.categoryName,
      path: (c.paths && Array.isArray(c.paths) ? c.paths.join(" > ") : (c.path || "")).trim(),
      leaf: c.leaf ?? false,
      parentId: c.parentCategoryId,
    }));

    return res.json({
      success: true,
      categories: normalized,
      total: totalFromApi ?? normalized.length,
      page: Number(page),
      size: Number(singlePageSize),
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
