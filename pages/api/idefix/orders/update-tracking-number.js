import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixUpdateTrackingNumber } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix kargo kodu bildirme (oms/{vendorId}/{shipmentId}/update-tracking-number)
 * Body: { shipmentId: number|string, trackingUrl: string, trackingNumber: string }
 * Sipariş statüsü shipment_in_cargo olarak güncellenir. trackingUrl, seçilmiş kargo profili ile uyumlu olmalıdır.
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

  const { shipmentId, trackingUrl, trackingNumber } = req.body || {};
  if (shipmentId == null || shipmentId === "") {
    return res.status(400).json({
      success: false,
      message: "shipmentId (kargo kodu bildirilecek sevkiyat ID) zorunludur.",
    });
  }
  if (!trackingUrl || String(trackingUrl).trim() === "") {
    return res.status(400).json({
      success: false,
      message: "trackingUrl (kargo takip URL) zorunludur.",
    });
  }
  if (!trackingNumber || String(trackingNumber).trim() === "") {
    return res.status(400).json({
      success: false,
      message: "trackingNumber (kargo takip numarası) zorunludur.",
    });
  }

  try {
    const data = await idefixUpdateTrackingNumber(creds, shipmentId, {
      trackingUrl: String(trackingUrl).trim(),
      trackingNumber: String(trackingNumber).trim(),
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
