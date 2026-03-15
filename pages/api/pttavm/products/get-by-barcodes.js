import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetProductsByBarcodes } from "@/lib/marketplaces/pttAvmService";

/**
 * POST: PTT AVM barkod ile ürün bilgisi (bulk)
 * Body: { barcodes: string[] }
 * Dokümantasyon: Barkod Kontrol Bulk
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  const creds = await getPttAvmCredentials(req);
  if (!creds?.apiKey || !creds?.accessToken) {
    return res.status(400).json({
      success: false,
      message: "PTT AVM API bilgileri eksik. API Ayarları → PTT AVM.",
      products: [],
    });
  }

  const barcodes = req.body?.barcodes;
  const list = Array.isArray(barcodes) ? barcodes.map((b) => String(b ?? "").trim()).filter(Boolean) : [];

  if (list.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Body'de barcodes (string[]) zorunludur ve en az bir barkod içermelidir.",
      products: [],
    });
  }

  try {
    const products = await pttAvmGetProductsByBarcodes(creds, list);
    return res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error_message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      products: [],
    });
  }
}
