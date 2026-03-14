/**
 * Pazarama Fatura Linki Güncelleme
 * POST order/invoice-link
 * deliveryCompanyId ve trackingNumber null → siparişteki tüm ürünlere fatura
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpdateInvoiceLink } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

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

  const { orderId, invoiceLink, deliveryCompanyId, trackingNumber } = req.body || {};
  if (!orderId || !invoiceLink) {
    return res.status(400).json({
      success: false,
      error: "orderId ve invoiceLink zorunludur.",
    });
  }

  try {
    const data = await pazaramaUpdateInvoiceLink(
      creds,
      orderId,
      invoiceLink,
      deliveryCompanyId ?? null,
      trackingNumber ?? null
    );
    return res.status(200).json({
      success: data?.success ?? true,
      message: data?.userMessage || data?.message || "Fatura linki güncellendi.",
    });
  } catch (err) {
    console.error("[Pazarama] Fatura linki hatası:", err.message);
    const msg = err.response?.data?.userMessage || err.response?.data?.message || err.message;
    return res.status(502).json({ success: false, error: msg });
  }
}
