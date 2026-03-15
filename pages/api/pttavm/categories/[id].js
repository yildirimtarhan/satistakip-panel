import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetCategory } from "@/lib/marketplaces/pttAvmService";

/**
 * GET: PTT AVM kategori bilgisi (id'ye ait ana kategori + children)
 * Query: id (zorunlu) – kategori id
 * Dokümantasyon: POST https://integration-api.pttavm.com/api/v1/categories/{id}
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
      category: null,
    });
  }

  const id = req.query.id ?? req.query.categoryId ?? "";
  if (!String(id).trim()) {
    return res.status(400).json({
      success: false,
      message: "Kategori id zorunludur (query: id veya categoryId).",
      category: null,
    });
  }

  try {
    const data = await pttAvmGetCategory(creds, id);
    return res.status(200).json({
      success: data.success === true,
      category: data.category || null,
      error: data.error || null,
    });
  } catch (err) {
    const msg = err.response?.data?.error?.error_message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      category: null,
    });
  }
}
