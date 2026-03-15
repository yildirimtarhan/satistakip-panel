import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixInventoryUpload } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix stok ve fiyat gönderimi (catalog/{vendorId}/inventory-upload)
 * Kataloga eklenmiş onaylı ürünlere stok/fiyat gönderir. Yanıttaki batchRequestId ile inventory-result ile durum sorgulanır.
 * Body: { items: [ { barcode*, price?, comparePrice?, inventoryQuantity?, maximumPurchasableQuantity?, deliveryDuration?, deliveryType?, isZoneSale? } ] }
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
      batchRequestId: null,
    });
  }

  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "items dizisi zorunludur ve en az bir ürün (barcode) içermelidir.",
      batchRequestId: null,
    });
  }

  try {
    const data = await idefixInventoryUpload(creds, items);
    return res.status(200).json({
      success: true,
      items: data.items ?? [],
      lastUpdatedAt: data.lastUpdatedAt ?? null,
      completedAt: data.completedAt ?? null,
      createdAt: data.createdAt ?? null,
      status: data.status ?? null,
      batchRequestId: data.batchRequestId ?? null,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      batchRequestId: null,
    });
  }
}
