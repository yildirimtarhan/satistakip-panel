import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmOrdersSearch } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM sipariş arama / kontrol V2 (tarih aralığında siparişler)
 * Query: startDate (zorunlu), endDate (zorunlu), isActiveOrders (zorunlu, true/false)
 * Kurallar: Tarih aralığı max 40 gün; bitiş >= başlangıç. isActiveOrders=false → tüm siparişler, true → sadece kargo_yapilmasi_bekleniyor
 * Dokümantasyon: Sipariş Kontrol V2
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
      orders: [],
    });
  }

  const startDate = req.query.startDate ?? "";
  const endDate = req.query.endDate ?? "";
  const isActiveOrders = req.query.isActiveOrders === "true" || req.query.isActiveOrders === true;

  if (!String(startDate).trim() || !String(endDate).trim()) {
    return res.status(400).json({
      success: false,
      message: "startDate ve endDate query parametreleri zorunludur (örn. 2024-01-01).",
      orders: [],
    });
  }

  try {
    const orders = await pttAvmOrdersSearch(creds, {
      startDate: String(startDate).trim(),
      endDate: String(endDate).trim(),
      isActiveOrders,
    });
    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      orders: [],
    });
  }
}
