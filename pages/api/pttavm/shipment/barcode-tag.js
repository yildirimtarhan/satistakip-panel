import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetBarcodeTag } from "@/lib/marketplaces/pttAvmService";

/**
 * POST: PTT AVM barkod etiket bilgisi (HTML veya ZPL) – Kargo entegrasyonu, Basic Auth
 * Body: { barcode: string, order_id: string, type?: "zpl" | null }
 * type "zpl" = Zebra yazıcı formatı, null/boş = HTML çıktı
 * Dokümantasyon: Barkod Etiket Bilgisi
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

  const barcode = req.body?.barcode ?? "";
  const order_id = req.body?.order_id ?? "";
  if (!String(barcode).trim() || !String(order_id).trim()) {
    return res.status(400).json({
      success: false,
      message: "Body'de barcode ve order_id zorunludur.",
    });
  }

  const type = req.body?.type != null ? String(req.body.type).trim() : null;
  const asJson = req.query?.format === "json" || req.body?.format === "json";

  try {
    const { content, contentType } = await pttAvmGetBarcodeTag(creds, {
      barcode: String(barcode).trim(),
      order_id: String(order_id).trim(),
      type: type || undefined,
    });

    if (asJson) {
      return res.status(200).json({
        success: true,
        content,
        contentType,
      });
    }

    res.setHeader("Content-Type", contentType);
    return res.status(200).send(content);
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message;
    const status = err.response?.status === 400 ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
