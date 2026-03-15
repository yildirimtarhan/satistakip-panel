import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetOrderCargoInfos } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM sipariş kargo bilgi listesi (Sipariş entegrasyonu)
 * Path: orderId (segment olarak bir üst route'tan)
 * Dokümantasyon: Kargo Bilgi Listesi
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
      cargoInfos: [],
    });
  }

  const orderId = req.query.orderId ?? req.query.order_id ?? "";
  if (!String(orderId).trim()) {
    return res.status(400).json({
      success: false,
      message: "orderId zorunludur (query: orderId).",
      cargoInfos: [],
    });
  }

  try {
    const cargoInfos = await pttAvmGetOrderCargoInfos(creds, orderId);
    return res.status(200).json({
      success: true,
      cargoInfos,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      cargoInfos: [],
    });
  }
}
