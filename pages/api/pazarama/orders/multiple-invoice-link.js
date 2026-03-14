/**
 * Pazarama item bazlı fatura linki güncelleme
 * POST order/multiple-invoice-link
 * Birden fazla sipariş kalemine aynı fatura linki atanır
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpdateMultipleInvoiceLink } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Sadece POST" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token gerekli" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const creds = await getPazaramaCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({ success: false, error: "Pazarama API bilgileri eksik." });
  }

  const { orderId, invoiceLink, orderItemIds, deliveryCompanyId, trackingNumber } = req.body || {};
  if (!orderId || !invoiceLink) {
    return res.status(400).json({ success: false, error: "orderId ve invoiceLink zorunlu." });
  }
  if (!Array.isArray(orderItemIds) || orderItemIds.length === 0) {
    return res.status(400).json({ success: false, error: "orderItemIds dizisi zorunlu (en az bir id)." });
  }

  try {
    const data = await pazaramaUpdateMultipleInvoiceLink(creds, {
      orderId,
      invoiceLink,
      orderItemIds,
      deliveryCompanyId: deliveryCompanyId ?? null,
      trackingNumber: trackingNumber ?? null,
    });
    return res.status(200).json({
      success: data?.success ?? true,
      data: data?.data ?? null,
      message: data?.userMessage || data?.message || "Fatura linki güncellendi.",
    });
  } catch (err) {
    console.error("[Pazarama] Multiple invoice link:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
