import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { createUbl } from "@/lib/efatura/createUbl";

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

    const { db } = await connectToDatabase();
    
    const userIdStr = String(decoded.userId || decoded._id || decoded.id || "");
    const companyIdStr = decoded.companyId ? String(decoded.companyId) : null;
    
    // Multi-tenant sorgusu
    const sentQuery = companyIdStr 
      ? { _id: oid, companyId: companyIdStr } 
      : { _id: oid, userId: userIdStr };

    const sentInvoice = await db.collection("efatura_sent").findOne(sentQuery);

    if (!sentInvoice) {
      return res.status(404).json({ message: "Gönderilmiş fatura bulunamadı veya yetkiniz yok" });
    }

    const companyQuery = companyIdStr
      ? { $or: [{ companyId: companyIdStr }, { userId: userIdStr }] }
      : { userId: userIdStr };
      
    const company = (await db.collection("company_settings").findOne(companyQuery)) || {};

    const invoiceForUbl = {
      ...sentInvoice,
      invoiceNumber: sentInvoice.invoiceNumber || sentInvoice.faturaNo || "KT2026000000000",
      issueDate: sentInvoice.issueDate || sentInvoice.createdAt || new Date().toISOString().slice(0, 10),
      uuid: sentInvoice.uuid || sentInvoice.taxtenUuid || "00000000-0000-0000-0000-000000000000"
    };

    const companyForUbl = {
      title: company.firmaAdi || company.title || company.companyTitle || "Firma Unvanı",
      vkn: company.vergiNo || company.vkn || "1111111111",
      vergiDairesi: company.vergiDairesi || "Vergi Dairesi",
      street: company.adres || company.street || "Adres",
      buildingNumber: company.binaNo || company.buildingNumber || "",
      city: company.sehir || company.city || "Şehir",
      district: company.ilce || company.district || "İlçe",
      phone: company.telefon || company.phone || "",
      email: company.eposta || company.email || "",
      website: company.web || company.website || "",
      country: company.ulke || company.country || "Türkiye",
    };

    const xmlText = createUbl(invoiceForUbl, companyForUbl);

    res.setHeader("Content-Type", "application/xml");
    return res.status(200).send(xmlText);
  } catch (err) {
    console.error("XML Oluşturma Hatası:", err);
    return res.status(500).json({ message: "XML oluşturulamadı", error: err.message });
  }
}
