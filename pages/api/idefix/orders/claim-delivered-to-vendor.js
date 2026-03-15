import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixClaimDeliveredToVendor } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix iade satıcıya ulaştı bildirimi (oms/{vendorId}/{claimId}/claim-delivered-to-vendor)
 * Body: { claimId: number|string, claimLineIds: (number|string)[] }
 * Depoya teslim edilmiş iadeler için onay/red öncesi zorunlu. claim-list'ten claimId (items[].id) ve claimLineIds (items[].items[].id).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri veya Satıcı ID eksik. API Ayarları → İdefix.",
    });
  }

  const { claimId, claimLineIds } = req.body || {};
  if (claimId == null || claimId === "") {
    return res.status(400).json({
      success: false,
      message: "claimId (iade talep ID) zorunludur. claim-list items[].id.",
    });
  }
  const ids = Array.isArray(claimLineIds) ? claimLineIds : [];
  if (ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "claimLineIds (işlem yapılacak kalem ID'leri) en az bir eleman içermelidir. claim-list items[].items[].id.",
    });
  }

  try {
    const data = await idefixClaimDeliveredToVendor(creds, claimId, ids);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
