import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetFaultyImages } from "@/lib/marketplaces/pttAvmService";

/**
 * POST: PTT AVM hatalı ürün görselleri
 * Body: { productBarcodes?: string[], paginationParameters?: { pageNumber, pageSize } }
 * Sayfalandırma veya barkodlardan en az biri zorunlu. Barkod max 10.000, pageSize max 10.000.
 * Dokümantasyon: Hatalı Ürün Görselleri
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
      productImagesWithErrorList: [],
    });
  }

  const productBarcodes = req.body?.productBarcodes;
  const paginationParameters = req.body?.paginationParameters;
  const hasBarcodes = Array.isArray(productBarcodes) && productBarcodes.length > 0;
  const hasPagination =
    paginationParameters &&
    (paginationParameters.pageNumber != null || paginationParameters.pageSize != null);

  if (!hasBarcodes && !hasPagination) {
    return res.status(400).json({
      success: false,
      message: "Sayfalandırma parametreleri (paginationParameters) veya barkod listesi (productBarcodes) sağlanmalıdır.",
      productImagesWithErrorList: [],
    });
  }

  if (hasBarcodes && productBarcodes.length > 10000) {
    return res.status(400).json({
      success: false,
      message: "Tek istekte en fazla 10.000 barkod gönderilebilir.",
      productImagesWithErrorList: [],
    });
  }

  try {
    const data = await pttAvmGetFaultyImages(creds, {
      ...(hasBarcodes ? { productBarcodes } : {}),
      ...(hasPagination ? { paginationParameters } : {}),
    });
    return res.status(200).json({
      success: data.success,
      message: data.message ?? null,
      productImagesWithErrorList: data.productImagesWithErrorList ?? [],
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      productImagesWithErrorList: [],
    });
  }
}
