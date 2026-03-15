import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixChangeCargoProvider } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix gönderi seçeneği değişikliği (oms/{vendorId}/{shipmentId}/change-cargo-provider/{vendorCargoProfile})
 * Body: { shipmentId: number|string, vendorCargoProfile: number|string }
 * Platform öder anlaşmalı veya takip edilebilen shipment'ların kargo profili değiştirilir. Profil listesi: vendor/cargo-company/profile.
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

  const { shipmentId, vendorCargoProfile } = req.body || {};
  if (shipmentId == null || shipmentId === "") {
    return res.status(400).json({
      success: false,
      message: "shipmentId (kargo değiştirilecek sevkiyat ID) zorunludur.",
    });
  }
  if (vendorCargoProfile == null || vendorCargoProfile === "") {
    return res.status(400).json({
      success: false,
      message: "vendorCargoProfile (yeni kargo profil ID) zorunludur. vendor/cargo-company/profile listesinden alınır.",
    });
  }

  try {
    const data = await idefixChangeCargoProvider(creds, shipmentId, vendorCargoProfile);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
