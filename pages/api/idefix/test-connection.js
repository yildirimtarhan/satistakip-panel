import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixTestConnection } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix API bağlantı testi (sevkiyat listesi 1 kayıt ile dener)
 * Test ortamı varsayılan; canlı için API Ayarları'nda Test modu kapalı yapılmalı.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri eksik. API Ayarları → İdefix (API Key, API Secret, Satıcı ID).",
    });
  }

  try {
    const result = await idefixTestConnection(creds);
    return res.status(200).json({
      success: result.success === true,
      message: result.message || "Bağlantı başarılı.",
      totalCount: result.totalCount,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
