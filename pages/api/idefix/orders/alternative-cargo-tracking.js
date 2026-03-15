import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixAlternativeCargoTracking } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix alternatif teslimat ile gönderim (oms/{vendorId}/{shipmentId}/alternative-cargo-tracking)
 * Body: { shipmentId, vendorCargoProfile, isPhoneNumber, trackingInfo: { trackingUrl?, phoneNumber? }, trackingNumber?, boxQuantity?, desi? }
 * isPhoneNumber true ise trackingInfo.phoneNumber zorunlu; false ise trackingInfo.trackingUrl zorunlu.
 * vendorCargoProfile: vendor/profile/list'ten isSellerTrackingSupport ve isPlatformAgreementSupport false olan profil ID.
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

  const { shipmentId, vendorCargoProfile, isPhoneNumber, trackingInfo, trackingNumber, boxQuantity, desi } = req.body || {};
  if (shipmentId == null || shipmentId === "") {
    return res.status(400).json({
      success: false,
      message: "shipmentId (takip bildirilecek sevkiyat ID) zorunludur.",
    });
  }
  if (vendorCargoProfile == null || vendorCargoProfile === "") {
    return res.status(400).json({
      success: false,
      message: "vendorCargoProfile (alternatif teslimat/kargo profil ID) zorunludur.",
    });
  }
  const isPhone = isPhoneNumber === true;
  const info = trackingInfo && typeof trackingInfo === "object" ? trackingInfo : {};
  if (isPhone) {
    if (!info.phoneNumber || String(info.phoneNumber).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "isPhoneNumber true olduğunda trackingInfo.phoneNumber zorunludur.",
      });
    }
  } else {
    if (!info.trackingUrl || String(info.trackingUrl).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "isPhoneNumber false olduğunda trackingInfo.trackingUrl zorunludur.",
      });
    }
  }

  try {
    const data = await idefixAlternativeCargoTracking(creds, shipmentId, {
      vendorCargoProfile: Number(vendorCargoProfile),
      isPhoneNumber: isPhone,
      trackingInfo: info,
      trackingNumber: trackingNumber != null ? String(trackingNumber) : undefined,
      boxQuantity: boxQuantity != null ? Number(boxQuantity) : undefined,
      desi: desi != null ? Number(desi) : undefined,
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
