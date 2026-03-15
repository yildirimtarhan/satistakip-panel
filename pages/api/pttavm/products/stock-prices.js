import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmUpdateStockPrices } from "@/lib/marketplaces/pttAvmService";

/**
 * POST: PTT AVM fiyat/stok güncelle (products/stock-prices)
 * Body: { items: [{ barcode, active?, quantity?, priceWithoutVAT?, priceWithVAT?, vatRate?, discount?, variants?, isCargoFromSupplier? }] }
 * Kurallar: Boş liste yok, max 1000 ürün, barkod zorunlu. En az biri güncellenmeli: stok, fiyat, kdv oranı veya aktivite.
 * trackingId ile GetProductsTrackingResult (tracking-result) ile sonuç takip edilir.
 * Dokümantasyon: Fiyat Stok Güncelle
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
      trackingId: null,
      countOfProductsToBeProcessed: null,
    });
  }

  const items = req.body?.items;
  const list = Array.isArray(items) ? items : [];

  if (list.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Body'de items (array) zorunludur ve en az bir ürün içermelidir. Boş ürün listesi gönderilemez.",
      trackingId: null,
      countOfProductsToBeProcessed: null,
    });
  }
  if (list.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Tek istekte en fazla 1000 ürün gönderilebilir.",
      trackingId: null,
      countOfProductsToBeProcessed: null,
    });
  }

  try {
    const data = await pttAvmUpdateStockPrices(creds, list);
    return res.status(200).json({
      success: data.success === true,
      message: data.message ?? null,
      trackingId: data.trackingId ?? null,
      countOfProductsToBeProcessed: data.countOfProductsToBeProcessed ?? list.length,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      trackingId: null,
      countOfProductsToBeProcessed: null,
    });
  }
}
