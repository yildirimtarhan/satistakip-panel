import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixSplitPackage } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix sipariş bölme (oms/{vendorId}/{shipmentId}/split-package)
 * Body: { shipmentId: number|string, splitPackageDetails: [ { items: [ { id: number }, ... ] } ] }
 * Bir paketteki item id'lerini gönderin; gönderilmeyen item'lar yeni shipment'a eklenir. Yeni shipment'lar list ile çekilir.
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

  const { shipmentId, splitPackageDetails } = req.body || {};
  if (shipmentId == null || shipmentId === "") {
    return res.status(400).json({
      success: false,
      message: "shipmentId (bölünecek sevkiyat ID) zorunludur.",
    });
  }
  if (!Array.isArray(splitPackageDetails) || splitPackageDetails.length === 0) {
    return res.status(400).json({
      success: false,
      message: "splitPackageDetails zorunludur ve en az bir paket (items dizisi) içermelidir.",
    });
  }

  try {
    const data = await idefixSplitPackage(creds, shipmentId, splitPackageDetails);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
