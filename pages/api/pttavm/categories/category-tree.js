import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetCategoryTree } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM kategori ağacı
 * Query: parent_id (opsiyonel, 0 = tüm ağaç), last_update (opsiyonel, tarih)
 * Dokümantasyon: POST https://integration-api.pttavm.com/api/v1/categories/category-tree
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getPttAvmCredentials(req);
  if (!creds?.apiKey || !creds?.accessToken) {
    return res.status(400).json({
      success: false,
      message: "PTT AVM API bilgileri eksik. API Ayarları → PTT AVM.",
      category_tree: [],
    });
  }

  const parent_id = req.query.parent_id;
  const last_update = req.query.last_update;

  try {
    const data = await pttAvmGetCategoryTree(creds, {
      ...(parent_id !== undefined && parent_id !== "" ? { parent_id } : {}),
      ...(last_update ? { last_update: String(last_update).trim() } : {}),
    });
    return res.status(200).json({
      success: data.success === true,
      category_tree: Array.isArray(data.category_tree) ? data.category_tree : [],
      error: data.error || null,
    });
  } catch (err) {
    const msg = err.response?.data?.error?.error_message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      category_tree: [],
    });
  }
}
