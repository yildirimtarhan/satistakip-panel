/**
 * POST: Fatura linki gönder (sendInvoiceLink)
 */
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { sellerInvoiceLinksUrl } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Sadece POST" });
  const creds = await getTrendyolCredentials(req);
  if (!creds) return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik." });

  const { shipmentPackageId, invoiceLink, invoiceNumber, invoiceDateTime } = req.body;
  if (!shipmentPackageId || !invoiceLink) {
    return res.status(400).json({
      success: false,
      message: "shipmentPackageId ve invoiceLink (fatura URL) zorunlu.",
    });
  }

  const body = {
    shipmentPackageId: Number(shipmentPackageId),
    invoiceLink: String(invoiceLink).trim(),
  };
  if (invoiceNumber) body.invoiceNumber = String(invoiceNumber);
  if (invoiceDateTime) body.invoiceDateTime = invoiceDateTime;

  const url = sellerInvoiceLinksUrl(creds.supplierId);
  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        success: false,
        message: data?.message || "Fatura linki gönderilemedi. Fatura rolü gerekebilir.",
        detail: data,
      });
    }
    return res.status(200).json({ success: true, message: "Fatura linki gönderildi", data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
