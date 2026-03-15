import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixManualDeliver } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix teslim edildi bilgisi gönderme (oms/{vendorId}/{shipmentId}/manual-deliver)
 * Body: { shipmentId: number|string, deliverDocumentUrl?: string, deliveryCode?: string }
 * Alternatif kargo ile yapılan gönderimler için teslim bildirimi.
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

  const { shipmentId, deliverDocumentUrl, deliveryCode } = req.body || {};
  if (shipmentId == null || shipmentId === "") {
    return res.status(400).json({
      success: false,
      message: "shipmentId (teslim bilgisi gönderilecek sevkiyat ID) zorunludur.",
    });
  }

  try {
    const data = await idefixManualDeliver(creds, shipmentId, {
      deliverDocumentUrl: deliverDocumentUrl != null ? String(deliverDocumentUrl).trim() : undefined,
      deliveryCode: deliveryCode != null ? String(deliveryCode).trim() : undefined,
    });
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
