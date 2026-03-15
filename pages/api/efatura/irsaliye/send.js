/**
 * E-İrsaliye Gönderimi
 * POST /api/efatura/irsaliye/send
 * Taxten: POST /Despatch/SendUbl
 */
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { createDespatchUbl } from "@/lib/efatura/createDespatchUbl";
import { createUblZip } from "@/lib/efatura/createUblZip";
import { despatchSendUbl } from "@/lib/taxten/taxtenClient";
import { getKontorUsed } from "@/lib/efatura/kontorUsage";

const SANAL_VKN = "3900892152";
const SANAL_ETIKET = "urn:mail:irsaliyepk@gib.gov.tr";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Token eksik" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = String(decoded.userId || decoded._id || decoded.id || "");
    const companyId = decoded.companyId ? String(decoded.companyId) : null;
    const tenantFilter = companyId ? { companyId } : { userId };

    const { db } = await connectToDatabase();

    const companyQuery = companyId
      ? { $or: [{ companyId }, { userId }] }
      : { userId };
    const company = await db.collection("company_settings").findOne(companyQuery);

    if (!company) {
      return res.status(400).json({ message: "Firma ayarları bulunamadı" });
    }

    const { irsaliye, isDraft = false } = req.body || {};
    if (!irsaliye) {
      return res.status(400).json({ message: "irsaliye verisi gerekli" });
    }

    // Kontör kontrolü (taslak hariç)
    if (!isDraft) {
      let limit = company.efaturaKontorLimit;
      if (typeof limit !== "number" || limit < 0) {
        const purchaseSum = await db
          .collection("efatura_kontor_purchases")
          .aggregate([{ $match: tenantFilter }, { $group: { _id: null, total: { $sum: "$amount" } } }])
          .toArray();
        limit = purchaseSum[0]?.total ?? null;
      }
      const hasLimit = typeof limit === "number" && limit >= 0;
      if (hasLimit) {
        const used = await getKontorUsed(db, tenantFilter);
        if (limit - used <= 0) {
          return res.status(402).json({
            error: "E-Belge kontörünüz tükenmiştir.",
            used,
            limit,
          });
        }
      }
    }

    const uuid = irsaliye.uuid || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    const companyForUbl = {
      title: company.firmaAdi || company.title || "",
      vkn: company.vergiNo || company.vkn,
      vergiDairesi: company.vergiDairesi || "",
      street: company.adres || company.street || "",
      buildingNumber: company.binaNo || "",
      city: company.sehir || company.city || "",
      district: company.ilce || company.district || "",
      phone: company.telefon || company.phone || "",
      email: company.eposta || company.email || "",
    };

    const irsaliyeForUbl = {
      ...irsaliye,
      uuid,
      customer: irsaliye.customer || {},
    };

    let xml;
    try {
      xml = createDespatchUbl(irsaliyeForUbl, companyForUbl);
    } catch (xmlErr) {
      console.error("İrsaliye XML hatası:", xmlErr);
      return res.status(500).json({ error: "XML oluşturulamadı", details: xmlErr.message });
    }

    const zipBuffer = createUblZip(xml, uuid);
    const docData = zipBuffer.toString("base64");

    const senderIdentifier = company.irsaliyeSenderIdentifier || company.senderIdentifier || `urn:mail:${company.taxtenUsername || company.vergiNo}`;
    const receiverVkn = irsaliye.customer?.vknTckn || irsaliye.customer?.vkn || irsaliye.customer?.identifier || "";
    const receiverIdentifier = receiverVkn ? `urn:mail:${receiverVkn}` : SANAL_ETIKET;

    const payload = {
      company,
      isTest: company.taxtenTestMode !== false,
      VKN_TCKN: company.vergiNo || company.vkn,
      DocType: "DESPATCH",
      DocData: docData,
      SenderIdentifier: senderIdentifier,
      ReceiverIdentifier: receiverIdentifier,
    };
    if (isDraft) payload.Parameters = ["IS_DRAFT"];

    let response;
    try {
      response = await despatchSendUbl(payload);
    } catch (apiErr) {
      console.error("Taxten E-İrsaliye API:", apiErr.response?.data || apiErr.message);
      return res.status(apiErr.response?.status || 502).json({
        error: "Taxten API hatası",
        message: apiErr.response?.data?.message || apiErr.message,
      });
    }

    const resp = Array.isArray(response?.Response) ? response.Response[0] : response?.Response || response;
    const docUuid = resp?.UUID || resp?.uuid || uuid;
    const envUuid = resp?.EnvUUID || resp?.envUuid;
    const irsaliyeId = resp?.ID || resp?.id || irsaliye.irsaliyeNo;

    const sentDoc = {
      ...irsaliye,
      irsaliyeNo: irsaliyeId,
      uuid: docUuid,
      envUuid,
      taxtenResponse: response,
      sentAt: new Date(),
      status: isDraft ? "draft" : "sent",
      userId,
      companyId: companyId || null,
    };

    await db.collection("efatura_irsaliye_sent").insertOne(sentDoc);

    return res.status(200).json({
      success: true,
      message: isDraft ? "Taslak kaydedildi" : "İrsaliye gönderildi",
      uuid: docUuid,
      envUuid,
      irsaliyeNo: irsaliyeId,
    });
  } catch (err) {
    console.error("E-İrsaliye Send:", err);
    return res.status(500).json({ error: err.message });
  }
}
