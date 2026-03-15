import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixClaimDeclineRequest } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix iade red talebi oluşturma (oms/{vendorId}/{claimId}/claim-decline-request)
 * Body: { claimId: number|string, claimLines: [ { id, claimDeclineReasonId, description?, images? } ] }
 * claimId ve kalem id'leri claim-list'ten; claimDeclineReasonId claim-decline-reasons'tan alınır.
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

  const { claimId, claimLines } = req.body || {};
  if (claimId == null || claimId === "") {
    return res.status(400).json({
      success: false,
      message: "claimId (iade talep ID) zorunludur. claim-list items[].id.",
    });
  }
  const lines = Array.isArray(claimLines) ? claimLines : [];
  if (lines.length === 0) {
    return res.status(400).json({
      success: false,
      message: "claimLines en az bir kalem içermelidir (id, claimDeclineReasonId). claim-list items[].items[].id; claim-decline-reasons için sebep id.",
    });
  }
  for (const line of lines) {
    if (line.id == null) {
      return res.status(400).json({ success: false, message: "Her claimLine için id (kalem ID) zorunludur." });
    }
    if (line.claimDeclineReasonId == null) {
      return res.status(400).json({ success: false, message: "Her claimLine için claimDeclineReasonId zorunludur." });
    }
  }

  try {
    const data = await idefixClaimDeclineRequest(creds, claimId, lines);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
