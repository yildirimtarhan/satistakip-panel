import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixUnsupplied } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix tedarik edilemedi bildirimi (oms/{vendorId}/{shipmentId}/unsupplied)
 * Body: { shipmentId: number|string, items: [ { id: number, reasonId: number } ] }
 * id = shipment içindeki tedarik edilemeyen item ID (list items[].items[].id). reasonId = reasons/noship'ten. İşlem sonrası güncel shipment'lar list ile tekrar çekilmelidir.
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

  const { shipmentId, items } = req.body || {};
  if (shipmentId == null || shipmentId === "") {
    return res.status(400).json({
      success: false,
      message: "shipmentId (tedarik edilemeyen sevkiyat ID) zorunludur.",
    });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "items zorunludur ve en az bir kalem (id, reasonId) içermelidir. reasonId reasons/noship listesinden alınır.",
    });
  }

  try {
    const data = await idefixUnsupplied(creds, shipmentId, items);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
