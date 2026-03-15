import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetOriginCountries } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix ülke listesi (country/origin-country)
 * Ürün create'te denetim bilgileri (originCountryId) için ülke ID'leri. Opsiyonel: ?name= ile filtreleme.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri eksik. API Ayarları → İdefix.",
      countries: [],
    });
  }

  const options = {};
  if (req.query.name) options.name = String(req.query.name).trim();

  try {
    const countries = await idefixGetOriginCountries(creds, options);
    return res.status(200).json({ success: true, countries });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      countries: [],
    });
  }
}
