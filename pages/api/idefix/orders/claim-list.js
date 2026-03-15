import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetClaimList } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix iade listesi (claim-list) – OMS iade talepleri
 * Query: ids, orderNumber, claimReason, startDate, endDate, lastUpdatedAt, page, limit
 * Tarih formatı: 2022/09/30 23:59:59
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

  const { ids, orderNumber, claimReason, startDate, endDate, lastUpdatedAt, page, limit } = req.query || {};

  try {
    const result = await idefixGetClaimList(creds, {
      ...(ids ? { ids: String(ids) } : {}),
      ...(orderNumber ? { orderNumber: String(orderNumber) } : {}),
      ...(claimReason != null ? { claimReason: String(claimReason) } : {}),
      ...(startDate ? { startDate: String(startDate) } : {}),
      ...(endDate ? { endDate: String(endDate) } : {}),
      ...(lastUpdatedAt ? { lastUpdatedAt: String(lastUpdatedAt) } : {}),
      ...(page != null ? { page: Number(page) || 1 } : {}),
      ...(limit != null ? { limit: Number(limit) || 50 } : {}),
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
