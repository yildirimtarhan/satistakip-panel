/**
 * Hepsiburada kategori özellikleri (Kapasite, Kart Tipi, Uyumluluk vb.).
 * Resmi doküman: Kategori Özelliklerini Alma + Özellik Değerini Alma (enum için ayrı endpoint).
 * - baseAttributes, attributes, variantAttributes birleştirilir.
 * - type=enum olanlar için /categories/{categoryId}/attribute/{attributeId}/values çağrılır.
 */
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
    const baseUrl = `${cfg.baseUrl}/product/api/categories/${categoryId}`;

    const attrsResponse = await axios.get(`${baseUrl}/attributes`, {
      params: { version: 2 },
      headers: hbApiHeaders(cfg, tokenObj),
      timeout: 15000,
    });

    const raw = attrsResponse.data;
    const data = raw?.data ?? raw;
    // Resmi API: baseAttributes, attributes, variantAttributes ayrı diziler (hepsini birleştir)
    const baseList = data?.baseAttributes ?? [];
    const attrList = data?.attributes ?? data?.categoryAttributes ?? [];
    const variantList = data?.variantAttributes ?? [];
    const seenIds = new Set();
    const list = [];
    for (const a of [...baseList, ...attrList, ...variantList]) {
      const id = a.id ?? a.attributeId ?? a.categoryAttributeId;
      if (id && !seenIds.has(String(id))) {
        seenIds.add(String(id));
        list.push(a);
      }
    }

    const attributes = [];
    for (const a of list) {
      const id = a.id ?? a.attributeId ?? a.categoryAttributeId;
      const name = a.name ?? a.attributeName ?? a.categoryAttributeName ?? "";
      const type = (a.type || "").toLowerCase();
      const mandatory = a.required ?? a.mandatory ?? false;
      let values = a.values ?? a.attributeValues ?? a.categoryAttributeValues ?? [];

      if ((type === "enum" || type === "dropdown") && id) {
        try {
          const valRes = await axios.get(`${baseUrl}/attribute/${id}/values`, {
            params: { version: 5, page: 0, size: 1000 },
            headers: hbApiHeaders(cfg, tokenObj),
            timeout: 10000,
          });
          const valRaw = valRes.data;
          const valData = valRaw?.data ?? valRaw?.content ?? valRaw;
          const arr = Array.isArray(valData) ? valData : (valData?.values ?? valData?.attributeValues ?? []);
          if (Array.isArray(arr)) {
            values = arr.map((v) => ({
              id: v.id ?? v.valueId ?? v.attributeValueId,
              name: typeof v === "object" ? (v.name ?? v.value ?? v.attributeValueName ?? "") : String(v),
            }));
          }
        } catch (e) {
          console.warn("HB attr values fetch failed:", id, e?.response?.status);
        }
      }

      const normalizedValues = (Array.isArray(values) ? values : []).map((v) => ({
        id: v.id ?? v.valueId ?? v.attributeValueId,
        name: typeof v === "object" ? (v.name ?? v.value ?? v.attributeValueName ?? "") : String(v),
      }));

      attributes.push({
        id,
        attributeId: id,
        name,
        attributeName: name,
        type: a.type,
        required: mandatory,
        mandatory,
        multiValue: a.multiValue ?? false,
        values: normalizedValues,
        attributeValues: normalizedValues,
      });
    }

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
