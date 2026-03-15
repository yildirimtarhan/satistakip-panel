import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetShipmentList } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix sevkiyat listesi (siparişler) – OMS list
 * Query: ids, orderNumber, state, startDate, endDate, lastUpdatedAt, page, limit, sortByField, sortDirection
 * Tarih formatı: 2022/09/30 23:59:59. vendor ayarlardan alınır.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri eksik. API Ayarları → İdefix.",
      items: [],
      totalCount: 0,
    });
  }

  const { ids, orderNumber, state, startDate, endDate, lastUpdatedAt, page, limit, sortByField, sortDirection } = req.query || {};

  try {
    const result = await idefixGetShipmentList(creds, {
      ...(ids ? { ids: String(ids) } : {}),
      ...(orderNumber ? { orderNumber: String(orderNumber) } : {}),
      ...(state ? { state: String(state) } : {}),
      ...(startDate ? { startDate: String(startDate) } : {}),
      ...(endDate ? { endDate: String(endDate) } : {}),
      ...(lastUpdatedAt ? { lastUpdatedAt: String(lastUpdatedAt) } : {}),
      ...(page != null ? { page: Number(page) || 1 } : {}),
      ...(limit != null ? { limit: Number(limit) || 20 } : {}),
      ...(sortByField ? { sortByField: String(sortByField) } : {}),
      ...(sortDirection ? { sortDirection: String(sortDirection) } : {}),
    });
    return res.status(200).json({
      success: true,
      items: result.items,
      totalCount: result.totalCount,
      itemCount: result.itemCount,
      pageCount: result.pageCount,
      currentPage: result.currentPage,
      limit: result.limit,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      items: [],
      totalCount: 0,
    });
  }
}
