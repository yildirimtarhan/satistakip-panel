import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetCargoProfiles } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM kargo profil listesi (Sipariş entegrasyonu)
 * Dokümantasyon: Kargo Profil
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getPttAvmCredentials(req);
  if (!creds?.apiKey || !creds?.accessToken) {
    return res.status(400).json({
      success: false,
      message: "PTT AVM API bilgileri eksik. API Ayarları → PTT AVM.",
      cargoProfiles: [],
    });
  }

  try {
    const data = await pttAvmGetCargoProfiles(creds);
    return res.status(200).json({
      success: true,
      cargoProfiles: data.cargoProfiles ?? [],
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      cargoProfiles: [],
    });
  }
}
