import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixCreateProducts } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix ürün oluşturma (pool/{vendorId}/create)
 * Body: { products: [ { barcode*, title*, productMainId*, brandId*, categoryId*, inventoryQuantity*, vendorStockCode*, description*, price*, vatRate*, images[].url*, attributes*, ... } ] }
 * Önce marka listesi, kategori listesi ve category-attribute (required=true alanlar zorunlu) alınmalı. Varyantlı ürünlerde productMainId aynı olmalı. Yanıttaki batchRequestId ile batch-result ile durum sorgulanır.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri veya Satıcı ID eksik. API Ayarları → İdefix.",
      batchRequestId: null,
    });
  }

  const products = req.body?.products;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      success: false,
      message: "products dizisi zorunludur ve en az bir ürün içermelidir.",
      batchRequestId: null,
    });
  }

  try {
    const data = await idefixCreateProducts(creds, products);
    return res.status(200).json({
      success: true,
      products: data.products ?? [],
      lastUpdatedAt: data.lastUpdatedAt ?? null,
      completedAt: data.completedAt ?? null,
      createdAt: data.createdAt ?? null,
      status: data.status ?? null,
      batchRequestId: data.batchRequestId ?? null,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      batchRequestId: null,
    });
  }
}
