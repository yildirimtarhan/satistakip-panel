import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetClaimDeclineReasons } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix iade red talebi sebep listesi (oms/claim-decline-reasons)
 * claim-decline-request servisinde kullanılacak red sebep ID'leri. Yanıt: id, name, description, createdAt, updatedAt, deletedAt.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({
      success: false,
      message: "İdefix API Key ve API Secret gerekli. API Ayarları → İdefix.",
      reasons: [],
    });
  }

  try {
    const reasons = await idefixGetClaimDeclineReasons(creds);
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
