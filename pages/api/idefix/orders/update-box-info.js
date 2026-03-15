import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixUpdateBoxInfo } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix desi, koli bilgisi gönderme (oms/{vendorId}/{shipmentId}/update-box-info)
 * Body: { shipmentId: number|string, boxQuantity: number, desi: number }
 * Lojistik kargo gönderileri için desi ve koli sayısı bildirimi.
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

  const { shipmentId, boxQuantity, desi } = req.body || {};
  if (shipmentId == null || shipmentId === "") {
    return res.status(400).json({
      success: false,
      message: "shipmentId (desi/koli bilgisi gönderilecek sevkiyat ID) zorunludur.",
    });
  }
  if (boxQuantity == null || Number(boxQuantity) < 0) {
    return res.status(400).json({
      success: false,
      message: "boxQuantity (koli sayısı) zorunludur ve 0 veya pozitif olmalıdır.",
    });
  }
  if (desi == null || Number(desi) < 0) {
    return res.status(400).json({
      success: false,
      message: "desi zorunludur ve 0 veya pozitif olmalıdır.",
    });
  }

  try {
    const data = await idefixUpdateBoxInfo(creds, shipmentId, {
      boxQuantity: Number(boxQuantity),
      desi: Number(desi),
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
