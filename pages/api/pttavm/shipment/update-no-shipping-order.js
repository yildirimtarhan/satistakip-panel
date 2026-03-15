import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmUpdateNoShippingOrder } from "@/lib/marketplaces/pttAvmService";

/**
 * POST: PTT AVM no-shipping siparişi teslim edildi yap (Barkod Status Güncelle)
 * Body: { order_id: string } – Dijital / kargo sürecine tabi olmayan sipariş; hazırlık veya gönderilmiş aşamasındakiler "teslim edildi" olur.
 * Dokümantasyon: Barkod Status Güncelle
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
    });
  }

  const order_id = req.body?.order_id ?? req.body?.orderId ?? "";
  if (!String(order_id).trim()) {
    return res.status(400).json({
      success: false,
      message: "Body'de order_id (sipariş numarası) zorunludur.",
    });
  }

  try {
    const result = await pttAvmUpdateNoShippingOrder(creds, order_id);
    return res.status(200).json({
      success: result.status === true,
      message: result.message ?? "",
      status: result.status,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    const status = err.response?.status === 400 ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: String(msg).slice(0, 300),
      status: false,
    });
  }
}
