/**
 * Zarf durumu sorgulama (Taxten 2.1.8 getEnvelopeStatus)
 * POST /api/efatura/envelope-status
 * Body: { sentId } – gönderilen fatura kaydı _id
 * E-Fatura: getInvoiceStatus(EnvUUID), E-Arşiv: earsivGetEnvelopeStatus
 */
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { getInvoiceStatus, earsivGetEnvelopeStatus } from "@/lib/taxten/taxtenClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token gerekli" });
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const { sentId } = req.body || {};
  if (!sentId) return res.status(400).json({ error: "sentId gerekli" });

  const companyId = decoded.companyId ? String(decoded.companyId) : null;
  const userId = String(decoded.userId || decoded._id || "");
  const tenantFilter = companyId ? { companyId } : { userId };

  const { db } = await connectToDatabase();
  let oid;
  try {
    oid = new ObjectId(sentId);
  } catch {
    return res.status(400).json({ error: "Geçersiz sentId" });
  }

  const sent = await db.collection("efatura_sent").findOne({ _id: oid, ...tenantFilter });
  if (!sent) return res.status(404).json({ error: "Gönderilen fatura bulunamadı" });

  const company = await db.collection("company_settings").findOne(
    companyId ? { $or: [{ companyId }, { userId: userId }] } : { userId: userId }
  );
  if (!company || (!company.taxtenUsername && !company.taxtenClientId)) {
    return res.status(400).json({ error: "Taxten API bilgisi yok." });
  }

  const isTest = company.taxtenTestMode !== false;
  const envUuid = sent.envUuid || sent.taxtenResponse?.EnvUUID || sent.taxtenResponse?.envUuid;
  const docUuid = sent.uuid || sent.taxtenResponse?.UUID;

  if (!envUuid && !docUuid) {
    return res.status(400).json({ error: "Bu kayıtta zarf/fatura UUID yok; durum sorgulanamaz." });
  }

  try {
    if (sent.isEarsiv) {
      const data = await earsivGetEnvelopeStatus({
        company,
        isTest,
        VKN_TCKN: company.vergiNo || company.vkn || "",
        UUID: docUuid ? [docUuid] : [envUuid],
      });
      return res.status(200).json({
        success: true,
        isEarsiv: true,
        envUuid,
        uuid: docUuid,
        data,
      });
    }

    const data = await getInvoiceStatus({
      company,
      isTest,
      Identifier: company.senderIdentifier || `urn:mail:${company.taxtenUsername || company.vergiNo}`,
      VKN_TCKN: company.vergiNo || company.vkn || "",
      UUID: envUuid ? [envUuid] : [docUuid],
    });
    return res.status(200).json({
      success: true,
      isEarsiv: false,
      envUuid: envUuid || docUuid,
      data,
    });
  } catch (err) {
    console.error("[envelope-status]", err.response?.data || err.message);
    return res.status(502).json({
      error: "Taxten API hatası",
      message: err.response?.data?.message || err.message,
    });
  }
}
