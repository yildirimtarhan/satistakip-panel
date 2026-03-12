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
    const { parentId, leaf: leafParam = "false", page = 0, size, search } = req.query;
    const preferLeaf = leafParam === "true";

    let url, params;
    const singlePageSize = Number(size) || 200;
    const fetchAllWhenSearching = search && search.trim().length >= 2;

    if (parentId) {
      url = `${cfg.baseUrl}/product/api/categories/${parentId}/sub-categories`;
      params = {};
    } else {
      url = `${cfg.baseUrl}/product/api/categories/get-all-categories`;
      params = { leaf: preferLeaf ? "true" : "false", status: "ACTIVE", available: true, page: fetchAllWhenSearching ? 0 : page, size: singlePageSize };
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

    // Arama: client-side filtrele (path/name)
    const doClientFilter = (list, q) => {
      if (!q || q.length < 2) return list;
      const lower = q.toLowerCase().trim();
      return list.filter((c) => {
        const name = (c.name || c.displayName || c.categoryName || "").toLowerCase();
        const pathStr = (c.paths && Array.isArray(c.paths) ? c.paths.join(" ") : (c.path || "")).toLowerCase();
        return name.includes(lower) || pathStr.includes(lower);
      });
    };

    if (search && search.trim().length >= 2) {
      categories = doClientFilter(categories, search);
      // leaf=true ile 0 sonuç gelirse, leaf=false ile tekrar dene (HB bazı aramalarda leaf kısıtıyla sonuç döndürmeyebilir)
      if (preferLeaf && categories.length === 0 && !parentId) {
        const fallbackParams = { leaf: "false", status: "ACTIVE", available: true, page: 0, size: 500 };
        if (search && search.trim()) fallbackParams.search = search.trim();
        try {
          const fallbackRes = await axios.get(url, {
            params: fallbackParams,
            headers: hbApiHeaders(cfg, tokenObj),
            timeout: 25000,
          });
          const fallbackRaw = fallbackRes.data;
          let fallbackList = fallbackRaw?.data || fallbackRaw?.categories || (Array.isArray(fallbackRaw) ? fallbackRaw : []);
          fallbackList = doClientFilter(fallbackList, search);
          // Sadece leaf kategorileri kullan (ürün açılabilir)
          categories = fallbackList.filter((c) => c.leaf === true);
        } catch {
          // Fallback hatası – mevcut boş liste kalsın
        }
      }
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
