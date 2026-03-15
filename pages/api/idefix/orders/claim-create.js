import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixClaimCreate } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix iade talebi oluşturma (oms/{vendorId}/claim-create)
 * Body: { customerId, orderNumber?, vendorCargoCompanyId?, vendorCargoProfileId?, items: [ { reasonId, orderLineId, customerNote? } ], images?, claimType? }
 * İade kodu almadan depoya gelen siparişler için iade talebi. reasonId: claim-reasons, orderLineId: sipariş kalem ID.
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

  const { customerId, orderNumber, vendorCargoCompanyId, vendorCargoProfileId, items, images, claimType } = req.body || {};
  if (customerId == null) {
    return res.status(400).json({
      success: false,
      message: "customerId (müşteri ID) zorunludur.",
    });
  }
  const itemList = Array.isArray(items) ? items : [];
  if (itemList.length === 0) {
    return res.status(400).json({
      success: false,
      message: "items en az bir kalem içermelidir (reasonId, orderLineId). reasonId: claim-reasons'tan.",
    });
  }
  for (const item of itemList) {
    if (item.reasonId == null) {
      return res.status(400).json({ success: false, message: "Her item için reasonId zorunludur (claim-reasons'tan)." });
    }
    if (item.orderLineId == null) {
      return res.status(400).json({ success: false, message: "Her item için orderLineId (iade edilecek kalem ID) zorunludur." });
    }
  }

  try {
    const data = await idefixClaimCreate(creds, {
      customerId: Number(customerId),
      orderNumber: orderNumber != null ? String(orderNumber).trim() : undefined,
      vendorCargoCompanyId: vendorCargoCompanyId != null ? Number(vendorCargoCompanyId) : undefined,
      vendorCargoProfileId: vendorCargoProfileId != null ? Number(vendorCargoProfileId) : undefined,
      items: itemList,
      images: Array.isArray(images) ? images.map((u) => String(u)) : undefined,
      claimType: claimType != null ? String(claimType).trim() : undefined,
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
