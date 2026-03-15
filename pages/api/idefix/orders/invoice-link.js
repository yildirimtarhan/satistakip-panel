import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixSendInvoiceLink } from "@/lib/marketplaces/idefixService";

/**
 * POST: İdefix fatura linki gönderme (oms/{vendorId}/{shipmentId}/invoice-link)
 * Body: { shipmentId: number|string, invoiceLink: "https://..." }
 * E-Arşiv veya e-Fatura linkinin İdefix'e iletilmesi.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri veya Satıcı ID eksik. API Ayarları → İdefix.",
    });
  }

  const { shipmentId, invoiceLink } = req.body || {};
  if (shipmentId == null || shipmentId === "") {
    return res.status(400).json({
      success: false,
      message: "shipmentId (fatura linkinin gönderileceği sevkiyat ID) zorunludur.",
    });
  }
  if (!invoiceLink || String(invoiceLink).trim() === "") {
    return res.status(400).json({
      success: false,
      message: "invoiceLink (fatura linki URL) zorunludur.",
    });
  }

  try {
    const data = await idefixSendInvoiceLink(creds, shipmentId, String(invoiceLink).trim());
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
    });
  }
}
