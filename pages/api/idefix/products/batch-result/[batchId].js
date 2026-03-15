import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetBatchResult } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix ürün toplu işlem sorgulama (pool/{vendorId}/batch-result/{batchId})
 * Ürün create yanıtındaki batchRequestId ile ürünlerin ve batch'in durumu sorgulanır.
 * products[].status, failureReasons, matchedProduct; batch status: created | completed | running | failed | cancelled.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const batchId = req.query.batchId ?? "";
  if (!String(batchId).trim()) {
    return res.status(400).json({
      success: false,
      message: "batchId (batchRequestId) zorunludur. Path: .../batch-result/[batchRequestId]",
      products: [],
      batchRequestId: null,
    });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri veya Satıcı ID eksik. API Ayarları → İdefix.",
      products: [],
      batchRequestId: null,
    });
  }

  try {
    const data = await idefixGetBatchResult(creds, batchId);
    return res.status(200).json({
      success: true,
      products: Array.isArray(data.products) ? data.products : [],
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
      products: [],
      batchRequestId: null,
    });
  }
}
