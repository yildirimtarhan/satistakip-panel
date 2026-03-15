import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetVendorCargoProfileList } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix satıcı kargo profil listesi (cargo-company/{vendorId}/profile/list)
 * Satıcı ID ayarlardan alınır. Satıcıya tanımlı kargo profil ID'leri buradan alınır.
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
      profiles: [],
    });
  }

  try {
    const profiles = await idefixGetVendorCargoProfileList(creds);
    return res.status(200).json({ success: true, profiles });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      profiles: [],
    });
  }
}
