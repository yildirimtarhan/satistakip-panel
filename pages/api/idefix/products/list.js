import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetProductList } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix ürünlerim listesi (pool/{vendorId}/list)
 * Pagination zorunlu: page, limit. Opsiyonel: barcode, state. vendorId ayarlardan alınır.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri veya Satıcı ID eksik. API Ayarları → İdefix.",
      products: [],
    });
  }

  const page = req.query.page != null ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : null;
  if (page == null || limit == null || !Number.isFinite(page) || !Number.isFinite(limit)) {
    return res.status(400).json({
      success: false,
      message: "page ve limit zorunludur (sayı olarak gönderin).",
      products: [],
    });
  }

  const params = { page, limit };
  if (req.query.barcode) params.barcode = String(req.query.barcode).trim();
  if (req.query.state) params.state = String(req.query.state).trim();

  try {
    const data = await idefixGetProductList(creds, params);
    return res.status(200).json({
      success: true,
      products: Array.isArray(data.products) ? data.products : [],
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      products: [],
    });
  }
}
