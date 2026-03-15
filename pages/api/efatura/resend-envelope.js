/**
 * Taxten 2.1.12 RESEND – Zarfı yeniden gönder (DocData ve ReceiverIdentifier gönderilmez)
 * POST /api/efatura/resend-envelope
 * Body: { sentId } – gönderilen fatura kaydı _id (envUuid bu kayıttan alınır)
 */
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { invoiceResendEnvelope } from "@/lib/taxten/taxtenClient";

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

  const envUuid = sent.envUuid || sent.taxtenResponse?.EnvUUID || sent.taxtenResponse?.envUuid;
  if (!envUuid) {
    return res.status(400).json({ error: "Bu kayıtta zarf UUID (envUuid) yok; RESEND yapılamaz." });
  }

  if (sent.isEarsiv) {
    return res.status(400).json({ error: "RESEND yalnızca E-Fatura için geçerlidir; E-Arşiv kaydı seçildi." });
  }

  const company = await db.collection("company_settings").findOne(
    companyId ? { $or: [{ companyId }, { userId: userId }] } : { userId: userId }
  );
  if (!company || (!company.taxtenUsername && !company.taxtenClientId)) {
    return res.status(400).json({ error: "Taxten API bilgisi yok." });
  }

  const isTest = company.taxtenTestMode !== false;
  const senderIdentifier = company.senderIdentifier || `urn:mail:${company.taxtenUsername || company.vergiNo}`;

  try {
    const data = await invoiceResendEnvelope({
      company,
      isTest,
      VKN_TCKN: company.vergiNo || company.vkn || "",
      SenderIdentifier: senderIdentifier,
      EnvUUID: envUuid,
    });

    const rawData = Array.isArray(data) && data.length > 0 ? data[0] : data;
    const newEnvUuid = rawData?.EnvUUID ?? rawData?.envUuid ?? rawData?.EnvUUID;
    const uuid = rawData?.UUID ?? rawData?.uuid;
    const id = rawData?.ID ?? rawData?.id;

    return res.status(200).json({
      success: true,
      message: "Zarf RESEND ile yeniden gönderildi.",
      envUuid: newEnvUuid,
      uuid,
      id,
      data: rawData,
    });
  } catch (err) {
    console.error("[resend-envelope]", err.response?.data || err.message);
    return res.status(502).json({
      error: "Taxten API hatası",
      message: err.response?.data?.message || err.message,
    });
  }
}
