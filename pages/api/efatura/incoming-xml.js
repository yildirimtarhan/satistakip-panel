import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { createUbl } from "@/lib/efatura/createUbl"; // Varsayılan UBL, ancak gelen fatura kendi XML'ini içermelidir.

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET desteklenir" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const { id } = req.query || {};
    if (!id) return res.status(400).json({ message: "id gerekli" });

    let oid;
    try {
      oid = new ObjectId(id);
    } catch {
      return res.status(400).json({ message: "Geçersiz id" });
    }

    const userIdStr = String(decoded.userId || decoded._id || decoded.id || "");
    const companyIdStr = decoded.companyId ? String(decoded.companyId) : null;
    
    // Multi-tenant sorgusu
    const incomingQuery = companyIdStr 
      ? { _id: oid, companyId: companyIdStr } 
      : { _id: oid, userId: userIdStr };

    const { db } = await connectToDatabase();
    const incomingInvoice = await db.collection("efatura_incoming").findOne(incomingQuery);

    if (!incomingInvoice) {
      return res.status(404).json({ message: "Gelen fatura bulunamadı veya bu veriye erişim yetkiniz yok" });
    }

    // Eğer gelen faturanın orijinal XML'i veritabanında saklanmışsa (örneğin rawXmlField), direkt onu dön:
    if (incomingInvoice.rawXml) {
       res.setHeader("Content-Type", "application/xml");
       return res.status(200).send(incomingInvoice.rawXml);
    }

    // Aksi takdirde, Taxten üzerinden indirilip kaydedilmediği durumlarda dummy UBL (tavsiye edilmez ama fallback olarak)
    const companyQuery = companyIdStr
      ? { $or: [{ companyId: companyIdStr }, { userId: userIdStr }] }
      : { userId: userIdStr };
      
    const company = (await db.collection("company_settings").findOne(companyQuery)) || {};

    const invoiceForUbl = {
      ...incomingInvoice,
      invoiceNumber: incomingInvoice.invoiceNo || incomingInvoice.faturaNo || "GELEN00000000",
      issueDate: incomingInvoice.issueDate || incomingInvoice.receivedAt || new Date().toISOString().slice(0, 10),
      uuid: incomingInvoice.uuid || incomingInvoice.taxtenUuid || "00000000-0000-0000-0000-000000000000",
      customer: {
        title: company.firmaAdi || company.title || "Alıcı",
        vknTckn: company.vergiNo || company.vkn || "1111111111"
      }
    };

    const senderForUbl = {
      title: incomingInvoice.senderTitle || incomingInvoice.gonderen || "Gönderici",
      vkn: incomingInvoice.senderVknTckn || incomingInvoice.vergiNo || "2222222222",
      vergiDairesi: "VD",
      street: "Adres",
      city: "Sehir"
    };

    const xmlText = createUbl(invoiceForUbl, senderForUbl);

    res.setHeader("Content-Type", "application/xml");
    return res.status(200).send(xmlText);
  } catch (err) {
    console.error("XML Oluşturma Hatası:", err);
    return res.status(500).json({ message: "XML oluşturulamadı", error: err.message });
  }
}
