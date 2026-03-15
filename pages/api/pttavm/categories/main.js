import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetMainCategories } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM ana kategori listesi
 * Dokümantasyon: POST https://integration-api.pttavm.com/api/v1/categories/main
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
      main_category: [],
    });
  }

  try {
    const data = await pttAvmGetMainCategories(creds);
    return res.status(200).json({
      success: data.success === true,
      main_category: Array.isArray(data.main_category) ? data.main_category : [],
      error: data.error || null,
    });
  } catch (err) {
    const msg = err.response?.data?.error?.error_message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      main_category: [],
    });
  }
}
