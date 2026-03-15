import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetBrands } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix marka listesi (brand)
 * Query: page, size (opsiyonel sayfalama). Ürün create'te marka bilgisi buradan alınır.
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
      brands: [],
    });
  }

  const page = req.query.page != null ? parseInt(req.query.page, 10) : undefined;
  const size = req.query.size != null ? parseInt(req.query.size, 10) : undefined;
  const options = {};
  if (Number.isFinite(page)) options.page = page;
  if (Number.isFinite(size)) options.size = size;

  try {
    const brands = await idefixGetBrands(creds, options);
    return res.status(200).json({ success: true, brands });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      brands: [],
    });
  }
}
