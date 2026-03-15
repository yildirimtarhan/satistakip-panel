import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetOrderDetail } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM sipariş detay (Sipariş entegrasyonu)
 * Path: orderId veya query ?orderId=...
 * Dokümantasyon: Sipariş Detay
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
      order: null,
    });
  }

  const orderId = req.query.orderId ?? req.query.order_id ?? "";
  if (!String(orderId).trim()) {
    return res.status(400).json({
      success: false,
      message: "orderId zorunludur (path veya query: orderId).",
      order: null,
    });
  }

  try {
    const order = await pttAvmGetOrderDetail(creds, orderId);
    return res.status(200).json({
      success: true,
      order: Array.isArray(order) ? order : [order],
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      order: null,
    });
  }
}
