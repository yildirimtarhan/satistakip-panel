import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetTrackingResult } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM işlem takip (tracking-result)
 * Aynı endpoint hem Ürün Ekleme/Güncelleme (upsert) hem de Fiyat/Stok Güncelle (stock-prices) sonrası dönen trackingId ile kullanılır.
 * Path: trackingId veya query ?trackingId=...
 * Dokümantasyon: Ürün Güncelleme Kontrol / Fiyat Stok Güncelleme Kontrolü (GetProductsTrackingResult)
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
      trackingId: null,
      status: null,
      progress: null,
      productsSubTrackingResult: null,
    });
  }

  const trackingId = req.query.trackingId ?? req.query.tracking_id ?? "";
  if (!String(trackingId).trim()) {
    return res.status(400).json({
      success: false,
      message: "trackingId zorunludur (path veya query: trackingId).",
      trackingId: null,
      status: null,
      progress: null,
      productsSubTrackingResult: null,
    });
  }

  try {
    const data = await pttAvmGetTrackingResult(creds, trackingId);
    return res.status(200).json({
      success: true,
      trackingId: data.trackingId ?? null,
      status: data.status ?? null,
      progress: data.progress ?? null,
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
      productsSubTrackingResult: data.productsSubTrackingResult ?? null,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      trackingId: null,
      status: null,
      progress: null,
      productsSubTrackingResult: null,
    });
  }
}
