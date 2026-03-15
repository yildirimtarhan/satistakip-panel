import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetBrandById } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix marka ID ile arama (brand/{markaId}) – tek marka döner.
 * Path: brandId. Ürün create'te markayı ID ile doğrulamak için.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const brandId = req.query.brandId ?? "";
  if (!String(brandId).trim()) {
    return res.status(400).json({
      success: false,
      message: "brandId (aranacak marka ID) zorunludur.",
      brand: null,
    });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri eksik. API Ayarları → İdefix.",
      brand: null,
    });
  }

  try {
    const brand = await idefixGetBrandById(creds, brandId);
    return res.status(200).json({
      success: true,
      brand: brand ?? null,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      brand: null,
    });
  }
}
