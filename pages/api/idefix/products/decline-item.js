import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixDeclineItem } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix ürün merchant red (pool/{vendorId}/decline-item)
 * waiting_vendor_approve statüsündeki ürünlerin eşleşmeyi reddetmesi. Body: { items: [ { barcode } ] }
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

  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "items dizisi zorunludur ve en az bir ürün (barcode) içermelidir.",
    });
  }

  try {
    const data = await idefixDeclineItem(creds, items);
    return res.status(200).json({
      success: true,
      items: data.items ?? [],
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
