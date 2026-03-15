import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetWarehouses } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM depo listesi (Kargo entegrasyonu – shipment.pttavm.com, Basic Auth)
 * Dokümantasyon: Depo Listeleme
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getPttAvmCredentials(req);
  if (!creds?.apiKey || !creds?.accessToken) {
    return res.status(400).json({
      success: false,
      message: "PTT AVM API bilgileri eksik. API Ayarları → PTT AVM (Api-Key ve access-token Kargo API için de kullanılır).",
      data: [],
    });
  }

  try {
    const result = await pttAvmGetWarehouses(creds);
    return res.status(200).json({
      success: result.status === true,
      data: result.data ?? [],
      msg: result.msg ?? null,
    });
  } catch (err) {
    const msg = err.response?.data?.msg || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      data: [],
    });
  }
}
