import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmSendOrderInvoice } from "@/lib/marketplaces/pttAvmService";

/**
 * POST: PTT AVM siparişe fatura gönder
 * Body: { lineItemId: number[], content?: string (Base64 PDF), url?: string (PDF URL) }
 * lineItemId sipariş detaydaki lineItemId değerleri; content veya url (biri zorunlu). URL varsa o esas alınır.
 * Dokümantasyon: Fatura Gönder
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
      error_Message: null,
    });
  }

  const orderId = req.query.orderId ?? req.query.order_id ?? req.body?.orderId ?? "";
  if (!String(orderId).trim()) {
    return res.status(400).json({
      success: false,
      message: "orderId zorunludur (path/query veya body).",
      error_Message: null,
    });
  }

  const lineItemId = req.body?.lineItemId;
  const lineItemIds = Array.isArray(lineItemId) ? lineItemId.map((x) => Number(x)).filter((n) => !Number.isNaN(n)) : [];
  if (lineItemIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Body'de lineItemId (number[]) zorunludur. Sipariş detaydaki lineItemId değerlerini gönderin.",
      error_Message: null,
    });
  }

  const content = req.body?.content != null ? String(req.body.content).trim() : null;
  const url = req.body?.url != null ? String(req.body.url).trim() : null;
  if (!content && !url) {
    return res.status(400).json({
      success: false,
      message: "Fatura için content (Base64 PDF) veya url (PDF URL) alanlarından biri zorunludur.",
      error_Message: null,
    });
  }

  try {
    const data = await pttAvmSendOrderInvoice(creds, orderId, {
      lineItemId: lineItemIds,
      content: content || undefined,
      url: url || undefined,
    });
    return res.status(200).json({
      success: data.success === true,
      error_Message: data.error_Message ?? null,
    });
  } catch (err) {
    const msg = err.response?.data?.error_Message || err.message;
    return res.status(500).json({
      success: false,
      message: String(msg).slice(0, 300),
      error_Message: msg,
    });
  }
}
