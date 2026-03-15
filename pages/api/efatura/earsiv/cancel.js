/**
 * e-Arşiv fatura iptali
 * POST /EArchiveInvoice/CancelInvoice
 */
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { earsivCancelInvoice } from "@/lib/taxten/taxtenClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token gerekli" });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const { db } = await connectToDatabase();
  const decoded = jwt.decode(token);
  const companyId = decoded?.companyId ? String(decoded.companyId) : null;
  const userId = String(decoded?.userId || "");
  const company = await db.collection("company_settings").findOne(
    companyId ? { $or: [{ companyId }, { userId }] } : { userId }
  );
  if (!company || (!company.efatura?.taxtenClientId && !company.taxtenUsername)) {
    return res.status(400).json({ error: "Taxten API bilgisi yok." });
  }

  const { invoiceId, custInvId, branch, totalAmount, cancelDate } = req.body || {};
  if (!invoiceId && !custInvId) {
    return res.status(400).json({ error: "invoiceId veya custInvId gerekli." });
  }
  if (!totalAmount || cancelDate == null) {
    return res.status(400).json({ error: "totalAmount ve cancelDate gerekli." });
  }

  try {
    const data = await earsivCancelInvoice({
      company,
      isTest: company.taxtenTestMode !== false,
      InvoiceId: invoiceId,
      CustInvId: custInvId,
      Branch: branch || company.taxtenBranch || "default",
      TotalAmount: Number(totalAmount),
      CancelDate: cancelDate,
    });
    return res.status(200).json(data);
  } catch (err) {
    console.error("[Taxten] E-Arşiv CancelInvoice:", err.response?.data || err.message);
    return res.status(502).json({ error: err.response?.data?.message || err.message });
  }
}
