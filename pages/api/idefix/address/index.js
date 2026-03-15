import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetVendorAddresses } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix sevkiyat ve iade adres listesi (vendor/{vendorId}/address)
 * Satıcı ID ayarlardan alınır. Create isteğinde adres ID'leri buradan kullanılır (return, invoice, shipping).
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
      addresses: [],
    });
  }

  try {
    const addresses = await idefixGetVendorAddresses(creds);
    return res.status(200).json({ success: true, addresses });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      addresses: [],
    });
  }
}
