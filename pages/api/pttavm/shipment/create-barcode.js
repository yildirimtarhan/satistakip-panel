import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmCreateBarcode } from "@/lib/marketplaces/pttAvmService";

/**
 * POST: PTT AVM kargo barkod oluştur (Kargo entegrasyonu – shipment.pttavm.com, Basic Auth)
 * Body: { orders: [{ order_id: string, warehouse_id: number }] }
 * Kurallar: Aynı sipariş numarası farklı depo ile olamaz. tracking_id ile barkod sorgulama yapılır.
 * Dokümantasyon: Barkod Oluştur
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
      tracking_id: null,
      count: 0,
    });
  }

  const orders = req.body?.orders;
  const list = Array.isArray(orders) ? orders : [];

  if (list.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Body'de orders (array) zorunludur. Her eleman: order_id (sipariş no), warehouse_id (depo id).",
      tracking_id: null,
      count: 0,
    });
  }

  try {
    const result = await pttAvmCreateBarcode(creds, list);
    return res.status(200).json({
      success: result.success,
      tracking_id: result.tracking_id ?? null,
      count: result.count ?? 0,
      code: result.code ?? 200,
      message: result.message ?? "",
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    const code = err.response?.data?.code ?? err.response?.status;
    const status = code === 422 ? 422 : 500;
    return res.status(status).json({
      success: false,
      message: String(msg).slice(0, 300),
      tracking_id: null,
      count: 0,
    });
  }
}
