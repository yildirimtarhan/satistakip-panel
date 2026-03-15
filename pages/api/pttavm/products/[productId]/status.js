import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmSetProductStatus } from "@/lib/marketplaces/pttAvmService";

/**
 * PUT: PTT AVM ürün aktif/pasif (PUT /api/v1/products/{productId}/status)
 * Body: { isActive: true | false }
 * Dokümantasyon: Aktif Yap
 */
export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Sadece PUT destekleniyor" });
  }

  const creds = await getPttAvmCredentials(req);
  if (!creds?.apiKey || !creds?.accessToken) {
    return res.status(400).json({
      success: false,
      message: "PTT AVM API bilgileri eksik. API Ayarları → PTT AVM.",
      errorMessage: null,
      errorCode: null,
    });
  }

  const productId = req.query.productId ?? req.body?.productId ?? "";
  const isActive = req.body?.isActive;

  if (!String(productId).trim()) {
    return res.status(400).json({
      success: false,
      message: "productId zorunludur (query veya body).",
      errorMessage: null,
      errorCode: null,
    });
  }
  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Body'de isActive (boolean) zorunludur.",
      errorMessage: null,
      errorCode: null,
    });
  }

  try {
    const data = await pttAvmSetProductStatus(creds, productId, isActive);
    return res.status(200).json({
      success: data.success === true,
      errorMessage: data.errorMessage ?? null,
      errorCode: data.errorCode ?? null,
    });
  } catch (err) {
    const msg = err.response?.data?.errorMessage || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      errorMessage: msg,
      errorCode: err.response?.data?.errorCode ?? null,
    });
  }
}
