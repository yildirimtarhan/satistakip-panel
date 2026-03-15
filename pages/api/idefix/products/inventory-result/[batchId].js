import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetInventoryResult } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix stok/fiyat toplu işlem sorgulama (inventory-result/{batchId})
 * inventory-upload yanıtındaki batchRequestId ile durum sorgulanır. status: created | decline | completed
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const batchId = req.query.batchId ?? "";
  if (!String(batchId).trim()) {
    return res.status(400).json({
      success: false,
      message: "batchId (batchRequestId) zorunludur. Path: .../inventory-result/[batchRequestId]",
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
    const data = await idefixGetInventoryResult(creds, batchId);
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
