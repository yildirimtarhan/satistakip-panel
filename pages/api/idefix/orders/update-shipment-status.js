import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixUpdateShipmentStatus } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix shipment statü güncelleme (oms/{vendorId}/{shipmentId}/update-shipment-status)
 * Body: { shipmentId: number|string, status: "picking" | "invoiced", invoiceNumber?: string }
 * picking: hazırlanmaya geçti (iptal edilemez). invoiced: fatura kesildi (invoiceNumber gönderin).
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

  const { shipmentId, status, invoiceNumber } = req.body || {};
  if (shipmentId == null || shipmentId === "") {
    return res.status(400).json({
      success: false,
      message: "shipmentId (statüsü güncellenecek sevkiyat ID) zorunludur.",
    });
  }
  if (status !== "picking" && status !== "invoiced") {
    return res.status(400).json({
      success: false,
      message: "status 'picking' veya 'invoiced' olmalıdır.",
    });
  }
  if (status === "invoiced" && (invoiceNumber == null || String(invoiceNumber).trim() === "")) {
    return res.status(400).json({
      success: false,
      message: "invoiced statüsü için invoiceNumber (fatura numarası) zorunludur.",
    });
  }

  try {
    const data = await idefixUpdateShipmentStatus(creds, shipmentId, {
      status,
      ...(invoiceNumber != null ? { invoiceNumber: String(invoiceNumber).trim() } : {}),
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
