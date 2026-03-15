import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetProductByBarcode } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM tek barkod ile ürün bilgisi (Barkod Kontrol)
 * Query: barcode (zorunlu)
 * Dokümantasyon: GET https://integration-api.pttavm.com/api/v1/products?barcode=...
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
      product: null,
    });
  }

  const barcode = req.query.barcode ?? req.query.barkod ?? "";
  if (!String(barcode).trim()) {
    return res.status(400).json({
      success: false,
      message: "Query parametresi barcode (veya barkod) zorunludur.",
      product: null,
    });
  }

  try {
    const product = await pttAvmGetProductByBarcode(creds, barcode);
    return res.status(200).json({
      success: true,
      product,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      product: null,
    });
  }
}
