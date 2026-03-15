import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetBrandByName } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix marka filtreleme (brand/by-name) – marka ismi ile tek marka döner.
 * Query: title (aranacak marka ismi). Ürün create'te markayı isimle seçmek için.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const title = req.query.title ?? "";
  if (!String(title).trim()) {
    return res.status(400).json({
      success: false,
      message: "title (aranacak marka ismi) zorunludur.",
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
    const brand = await idefixGetBrandByName(creds, title);
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
