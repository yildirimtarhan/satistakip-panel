import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetCategoryAttributes } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix kategori özellik listesi (category-attribute)
 * Path: categoryId (en alt seviye kategori ID). Ürün create'te attributes buradan alınır; required=true olanlar zorunlu.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const categoryId = req.query.categoryId ?? req.query.categoryID ?? "";
  if (!String(categoryId).trim()) {
    return res.status(400).json({
      success: false,
      message: "categoryId (en alt seviye kategori ID) zorunludur.",
      categoryAttributes: null,
    });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri eksik. API Ayarları → İdefix.",
      categoryAttributes: null,
    });
  }

  try {
    const data = await idefixGetCategoryAttributes(creds, categoryId);
    return res.status(200).json({
      success: true,
      id: data.id,
      name: data.name,
      categoryAttributes: data.categoryAttributes ?? [],
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      categoryAttributes: null,
    });
  }
}
