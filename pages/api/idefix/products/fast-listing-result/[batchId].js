import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetFastListingResult } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix hızlı ürün ekleme durum sorgulama (fast-listing-result/{batchID})
 * Path: batchId = fast-listing yanıtındaki batchRequestId. Body boş.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  const batchId = req.query.batchId ?? "";
  if (!String(batchId).trim()) {
    return res.status(400).json({
      success: false,
      message: "batchId (batchRequestId) zorunludur. Path: .../fast-listing-result/[batchRequestId]",
      items: [],
      batchRequestId: null,
    });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri veya Satıcı ID eksik. API Ayarları → İdefix.",
      items: [],
      batchRequestId: null,
    });
  }

  try {
    const data = await idefixGetFastListingResult(creds, batchId);
    return res.status(200).json({
      success: true,
      items: Array.isArray(data.items) ? data.items : [],
      lastUpdatedAt: data.lastUpdatedAt ?? null,
      completedAt: data.completedAt ?? null,
      createdAt: data.createdAt ?? null,
      status: data.status ?? null,
      batchRequestId: data.batchRequestId ?? batchId,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      items: [],
      batchRequestId: null,
    });
  }
}
