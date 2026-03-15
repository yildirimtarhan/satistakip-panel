import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetBarcodeStatus } from "@/lib/marketplaces/pttAvmService";

/**
 * POST: PTT AVM barkod oluşturma kontrolü (Kargo entegrasyonu – shipment.pttavm.com, Basic Auth)
 * Body: { tracking_id: string } – create-barcode yanıtındaki tracking_id
 * status: completed | error | pending
 * Dokümantasyon: Barkod Oluşturma Kontrolü
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
      status: null,
      data: [],
    });
  }

  const tracking_id = req.body?.tracking_id ?? req.query?.tracking_id ?? "";
  if (!String(tracking_id).trim()) {
    return res.status(400).json({
      success: false,
      message: "tracking_id zorunludur (body veya query). Barkod oluşturma yanıtındaki tracking_id ile sorgulayın.",
      tracking_id: null,
      status: null,
      data: [],
    });
  }

  try {
    const result = await pttAvmGetBarcodeStatus(creds, tracking_id);
    return res.status(200).json({
      success: true,
      tracking_id: result.tracking_id,
      status: result.status,
      data: result.data ?? [],
      error: result.error ?? "",
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message;
    const status = err.response?.status === 422 ? 422 : 500;
    return res.status(status).json({
      success: false,
      message: String(msg).slice(0, 300),
      tracking_id: null,
      status: null,
      data: [],
    });
  }
}
