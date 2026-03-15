import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixClaimApprove } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix iade talep onayı (oms/{vendorId}/{claimId}/claim-approve)
 * Body: { claimId: number|string, claimLineIds: (number|string)[] }
 * Depoya teslim edilmiş iade taleplerindeki kalemleri onaylar. claim-list'ten claimId (items[].id) ve claimLineIds (items[].items[].id) alınır.
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
      message: "claimLineIds (onaylanacak kalem ID'leri) en az bir eleman içermelidir. claim-list items[].items[].id.",
    });
  }

  try {
    const data = await idefixClaimApprove(creds, claimId, ids);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
