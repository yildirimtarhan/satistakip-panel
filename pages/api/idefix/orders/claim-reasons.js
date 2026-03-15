import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetClaimReasons } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix iade talep sebep listesi (oms/{vendorId}/claim-reasons)
 * claim-create ve claim-list'te kullanılacak sebep ID'leri. Her öğe: id, name, type (platform|customer).
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
    const reasons = await idefixGetClaimReasons(creds);
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
