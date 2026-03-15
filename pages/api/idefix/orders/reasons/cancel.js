import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetCancelReasons } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix iptal sebep listesi (oms/{vendorId}/reasons/cancel)
 * Müşteri iptallerinin sebep ID'leri. Yanıt: id, name, reasonType (cancel), description, createdAt, updatedAt, deletedAt.
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
      reasons: [],
    });
  }

  try {
    const reasons = await idefixGetCancelReasons(creds);
    return res.status(200).json({ success: true, reasons });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      reasons: [],
    });
  }
}
