import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetInventoryList } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix stok ve fiyat güncel durum listesi (catalog/{vendorId}/inventory/list)
 * Ürünlerin güncel stok ve fiyat bilgileri. vendorId ayarlardan alınır.
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
      items: [],
    });
  }

  try {
    const data = await idefixGetInventoryList(creds);
    return res.status(200).json({
      success: true,
      items: Array.isArray(data.items) ? data.items : [],
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      items: [],
    });
  }
}
