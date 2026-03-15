import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmProductsSearch } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM stok kontrol listesi / ürün arama
 * Query: categoryId, subCategoryId, isActive (0|1|2), isInStock (0|1|2), merchantCategoryId, searchPage, yeniKategoriId (opsiyonel)
 * Dokümantasyon: Stok Kontrol Listesi
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
      products: [],
    });
  }

  const {
    categoryId,
    subCategoryId,
    isActive,
    isInStock,
    merchantCategoryId,
    searchPage,
    yeniKategoriId,
  } = req.query || {};

  try {
    const products = await pttAvmProductsSearch(creds, {
      ...(categoryId !== undefined && categoryId !== "" ? { categoryId } : {}),
      ...(subCategoryId !== undefined && subCategoryId !== "" ? { subCategoryId } : {}),
      ...(isActive !== undefined && isActive !== "" ? { isActive: Number(isActive) } : {}),
      ...(isInStock !== undefined && isInStock !== "" ? { isInStock: Number(isInStock) } : {}),
      ...(merchantCategoryId !== undefined && merchantCategoryId !== "" ? { merchantCategoryId } : {}),
      ...(searchPage !== undefined && searchPage !== "" ? { searchPage: Number(searchPage) } : {}),
      ...(yeniKategoriId !== undefined && yeniKategoriId !== "" ? { yeniKategoriId } : {}),
    });
    return res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      products: [],
    });
  }
}
