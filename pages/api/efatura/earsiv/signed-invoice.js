/**
 * İmzalı e-Arşiv fatura XML
 * POST /EArchiveInvoice/GetSignedInvoice
 */
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { earsivGetSignedInvoice } from "@/lib/taxten/taxtenClient";

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

  const { uuid, invoiceNumber, custInvId } = req.body || {};
  if (!uuid && !invoiceNumber && !custInvId) {
    return res.status(400).json({ error: "uuid, invoiceNumber veya custInvId gerekli." });
  }

  try {
    const data = await earsivGetSignedInvoice({
      company,
      isTest: company.taxtenTestMode !== false,
      UUID: uuid,
      InvoiceNumber: invoiceNumber,
      CustInvId: custInvId,
    });
    return res.status(200).json(data);
  } catch (err) {
    console.error("[Taxten] E-Arşiv GetSignedInvoice:", err.response?.data || err.message);
    return res.status(502).json({ error: err.response?.data?.message || err.message });
  }
}
