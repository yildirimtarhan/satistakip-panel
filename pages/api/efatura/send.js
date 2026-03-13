import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createUbl } from "@/lib/efatura/createUbl";
import { createUblZip } from "@/lib/efatura/createUblZip";
import axios from "axios";
import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import Cari from "@/models/Cari";
import { pushStockToMarketplaces } from "@/lib/pazaryeriStockSync";
import Counter from "@/models/Counter";

/**
 * Taxten API Hata Kodları ve Açıklamaları
 */
const TAXTEN_ERROR_CODES = {
  5: "Zip boyutu aşıldı (max 5MB)",
  20: "Desteklenmeyen işlem. Zip içindeki fatura sayısını ve OutputType kontrol edin",
  25: "Şema geçersiz (UBL-TR şema validasyonu hatası)",
  30: "VKN/TCKN e-Fatura mükellefine ait değil",
  35: "Data boyutu aşıldı",
  37: "XSLT Bulunamadı (Faturaya XSLT eklenmemiş)",
  40: "Şematron geçersiz",
  46: "e-Arşiv faturanın göndericisi geçersiz",
  50: "Rapor veri alanları hatalı/eksik",
  56: "IssueDate raporlama periyodu dışında",
  60: "Zarf database'de mevcut (UUID çakışması)",
  65: "Rapor database'de mevcut",
  70: "e-Arşiv fatura database'de mevcut",
  75: "e-Arşiv fatura ID'si üretilirken hata oluştu",
  90: "Hash doğrulanırken hata oluştu",
  99: "Genel sistem hatası",
  1000: "Parametre Hatası",
  1010: "Şema validasyonu hatası",
  1020: "Şematron hatası",
  1080: "UTF-8 validasyonu hatası",
  1100: "Gönderici VKN/TCKN ve etiketi GİB'e kayıtlı değil",
  1101: "Alıcı VKN/TCKN ve etiketi GİB'e kayıtlı değil",
  1110: "Gönderici VKN/TCKN ve etiketi kayıtlı değil",
  1111: "Alıcı VKN/TCKN ve etiketi kayıtlı değil",
  1112: "VKN/TCKN ve etiket kayıtlı değil",
  1200: "İstemci IP adresinin bu işleme yetkisi yok",
  1300: "Çağrı limiti aşıldı",
  3010: "Zarf UUID sistemde mevcut",
  3011: "Fatura UUID sistemde mevcut",
  3012: "Fatura ID sistemde mevcut",
  3013: "Fatura ID otomatik üretiliyor, gönderilmemeli",
  3014: "Fatura ID otomatik üretiliyor, müşteri fatura numarası gönderilmeli",
  3410: "UUID'ye ait fatura bulunmadı",
  3420: "CustInvID'ye ait fatura bulunmadı",
  3430: "Fatura gönderilen VKN ve etikete ait değil",
  3440: "Fatura görüntüsü doküman türü desteklenmiyor",
  3450: "Fatura görüntüsü oluşturulamadı",
};

/**
 * Taxten'den dönen hatayı parse et
 */
function parseTaxtenError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    
    let detailMessage = "";
    if (data.errors && Array.isArray(data.errors)) {
      detailMessage = " " + data.errors.map(e => e.message || e).join(" | ");
    } else if (data.Errors && Array.isArray(data.Errors)) {
      detailMessage = " " + data.Errors.map(e => e.Message || e.message || e).join(" | ");
    } else if (typeof data.message === "string" && data.message.length > 50) {
      detailMessage = " " + data.message;
    }
    
    if (data.errorCode || data.ErrorCode) {
      const code = parseInt(data.errorCode || data.ErrorCode);
      return { 
        code, 
        message: (TAXTEN_ERROR_CODES[code] || data.message || "Bilinmeyen hata") + detailMessage,
        raw: data 
      };
    }
    
    if (data.message || data.Message) {
      return { code: null, message: (data.message || data.Message) + detailMessage, raw: data };
    }
  }
  
  if (error.message) {
    return { code: null, message: error.message, raw: error };
  }
  
  return { code: null, message: "Bilinmeyen bir hata oluştu", raw: error };
}

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Sadece POST metodu desteklenir" });
    }

    // JWT Token Doğrulama
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Geçersiz veya süresi dolmuş token" });
    }

    const userId = String(decoded.userId || decoded._id || decoded.id || "");
    const companyId = decoded.companyId ? String(decoded.companyId) : null;

    const { invoiceId, isDraft = false } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ error: "invoiceId gerekli" });
    }

    // Tenant Filter
    const tenantFilter = companyId ? { companyId } : { userId };

    // Taslak Faturayı Getir
    const invoice = await db.collection("efatura_drafts").findOne({
      _id: new ObjectId(invoiceId),
      ...tenantFilter
    });
    
    if (!invoice) {
      return res.status(404).json({ error: "Taslak fatura bulunamadı" });
    }

    // Firma Ayarlarını Getir
    const companyQuery = companyId
      ? { $or: [{ companyId }, { userId }] }
      : { userId };
    const company = await db.collection("company_settings").findOne(companyQuery);
    
    if (!company) {
      return res.status(400).json({ 
        error: "Firma ayarları eksik. Lütfen E-Fatura başvurusu yapın veya firma ayarlarınızı doldurun." 
      });
    }

    // Zorunlu alanları kontrol et
    const requiredFields = ['vergiNo', 'vergiDairesi', 'adres', 'telefon', 'eposta'];
    const missingFields = requiredFields.filter(f => !company[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Firma ayarları eksik: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Fatura Numarası Oluştur - YILLIK SAYAÇ (KT-2025-000001)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    let invoiceNumber = invoice.invoiceNumber ? String(invoice.invoiceNumber).trim() : "";
    let custInvId = null;
    
    const prefix = company.efaturaFaturaNoPrefix || "KT";
    const useAutoId = company.efaturaAutoId === true;
    
    if (!invoiceNumber) {
      if (useAutoId) {
        custInvId = `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        invoiceNumber = "AUTO";
      } else {
        await dbConnect();
        const year = now.getFullYear();
        // YILLIK SAYAÇ - month kaldırıldı
        const companyIdForCounter = companyId || userId;
        const companyIdObj = mongoose.Types.ObjectId.isValid(companyIdForCounter)
          ? new mongoose.Types.ObjectId(companyIdForCounter)
          : companyIdForCounter;
          
        const counter = await Counter.findOneAndUpdate(
          { key: "efaturaNo", companyId: companyIdObj, year }, // month kaldırıldı
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        
        // Format: KT-2025-000001 (yıllık sıralı)
        invoiceNumber = `${prefix}-${year}-${String(counter.seq).padStart(6, "0")}`;
      }
    }

    // UBL XML Oluştur
    const invoiceForUbl = {
      ...invoice,
      invoiceNumber,
      issueDate: invoice.issueDate || dateStr,
      custInvId,
    };

    const companyForUbl = {
      title: company.firmaAdi || company.title || company.companyTitle || "",
      vkn: company.vergiNo || company.vkn || "",
      vergiDairesi: company.vergiDairesi || company.taxOffice || "",
      street: company.adres || company.street || "",
      buildingNumber: company.binaNo || company.buildingNumber || "",
      city: company.sehir || company.city || "",
      district: company.ilce || company.district || "",
      phone: company.telefon || company.phone || "",
      email: company.eposta || company.email || "",
      website: company.web || company.website || "",
      country: company.ulke || company.country || "Türkiye",
    };

    let xml;
    try {
      xml = createUbl(invoiceForUbl, companyForUbl);
    } catch (xmlErr) {
      console.error("XML oluşturma hatası:", xmlErr);
      return res.status(500).json({
        error: "Fatura XML'i oluşturulurken hata oluştu",
        details: xmlErr.message,
      });
    }

    // ZIP Oluştur
    let zipBuffer;
    try {
      zipBuffer = createUblZip(xml, invoice.uuid);
    } catch (zipErr) {
      console.error("ZIP oluşturma hatası:", zipErr);
      return res.status(500).json({
        error: "ZIP dosyası oluşturulurken hata oluştu",
        details: zipErr.message,
      });
    }
    
    const zipBase64 = zipBuffer.toString("base64");

    // Taxten API Ayarları
    const isTestMode = company.taxtenTestMode !== false;
    const baseUrl = isTestMode
      ? "https://devrest.taxten.com/api/v1"
      : "https://rest.taxten.com/api/v1";

    const isEarsiv = (invoice.invoiceType || "").toUpperCase().includes("EARSIV");
    const endpoint = isEarsiv ? "/EArchiveInvoice/SendUbl" : "/Invoice/SendUbl";
    const apiUrl = `${baseUrl}${endpoint}`;

    // Kimlik Doğrulama
    const useClientId = company.efatura?.taxtenClientId && company.efatura?.taxtenApiKey;
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    if (useClientId) {
      headers["x-client-id"] = company.efatura.taxtenClientId;
      headers["x-api-key"] = company.efatura.taxtenApiKey;
    } else if (company.taxtenUsername && company.taxtenPassword) {
      headers.Authorization = `Basic ${Buffer.from(`${company.taxtenUsername}:${company.taxtenPassword}`).toString("base64")}`;
    } else {
      return res.status(400).json({
        error: "Taxten API bilgisi eksik. ClientId+ApiKey veya Username+Password girilmeli.",
      });
    }

    // Taxten API İsteği
    const senderVkn = company.vergiNo || company.vkn || "";
    const receiverVkn = invoice.customer?.vknTckn || invoice.customer?.vkn || invoice.customer?.identifier || "";

    if (!receiverVkn) {
      return res.status(400).json({
        error: "Alıcı VKN/TCKN eksik. Müşteri kartında vergi numarası tanımlanmalı.",
      });
    }

    const payload = {
      vkN_TCKN: senderVkn,
      senderIdentifier: company.senderIdentifier || `urn:mail:${company.taxtenUsername || senderVkn}`,
      receiverIdentifier: `urn:mail:${receiverVkn}`,
      docType: "INVOICE",
      docData: zipBase64,
    };

    if (isEarsiv) {
      payload.Branch = company.taxtenBranch || company.branch || "default";
      payload.OutputType = company.taxtenOutputType || "PDF";
    }

    if (isDraft) {
      payload.parameters = ["IS_DRAFT"];
    }

    // Taxten API Çağrısı
    let taxtenResponse;
    try {
      taxtenResponse = await axios.post(apiUrl, payload, { 
        headers,
        timeout: 300000,
        maxBodyLength: 10 * 1024 * 1024,
        maxContentLength: 10 * 1024 * 1024,
      });
    } catch (apiErr) {
      console.error("Taxten API hatası:", apiErr.response?.data || apiErr.message);
      const parsedError = parseTaxtenError(apiErr);
      
      return res.status(apiErr.response?.status || 502).json({
        error: "Taxten API hatası",
        message: parsedError.message,
        code: parsedError.code,
        suggestion: parsedError.code === 37 ? "XSLT şablonu eksik" :
                   parsedError.code === 25 ? "UBL şema hatası" :
                   parsedError.code === 1100 ? "GİB kaydı bulunamadı" :
                   "Lütfen daha sonra tekrar deneyin",
      });
    }

    const responseData = taxtenResponse.data;
    const finalInvoiceNumber = responseData.invoiceNumber || 
                              responseData.InvoiceNumber || 
                              responseData.id || 
                              responseData.ID || 
                              invoiceNumber;

    // Gönderilen Faturayı Kaydet
    const sentDoc = {
      ...invoice,
      invoiceNumber: finalInvoiceNumber,
      invoiceNo: finalInvoiceNumber,
      faturaNo: finalInvoiceNumber,
      uuid: responseData.uuid || responseData.UUID || invoice.uuid,
      envUuid: responseData.envUuid || responseData.EnvUUID || null,
      taxtenResponse: responseData,
      sentAt: new Date(),
      status: isDraft ? "draft" : "sent",
      isEarsiv,
      userId,
      companyId: companyId || null,
    };

    await db.collection("efatura_sent").insertOne(sentDoc);

    // Taslağı Güncelle
    await db.collection("efatura_drafts").updateOne(
      { _id: new ObjectId(invoiceId), ...tenantFilter },
      { 
        $set: { 
          invoiceNumber: finalInvoiceNumber,
          issueDate: dateStr,
          status: isDraft ? "draft" : "sent",
          taxtenUuid: responseData.uuid || responseData.UUID,
          updatedAt: new Date() 
        } 
      }
    );

    // ERP İşlemleri
    if (!isDraft) {
      await processErpTransactions(invoice, finalInvoiceNumber, userId, companyId);
    }

    return res.status(200).json({
      success: true,
      message: isDraft ? "Taslak Taxten'e kaydedildi" : "Fatura başarıyla gönderildi",
      invoiceNumber: finalInvoiceNumber,
      uuid: sentDoc.uuid,
      envUuid: sentDoc.envUuid,
      isEarsiv,
      testMode: isTestMode,
    });

  } catch (err) {
    console.error("SEND ERROR:", err);
    return res.status(500).json({ 
      error: "Beklenmeyen bir hata oluştu", 
      details: err.message,
    });
  }
}

async function processErpTransactions(invoice, invoiceNumber, userId, companyId) {
  try {
    await dbConnect();
    
    const isSale = (invoice.invoiceType || "").toUpperCase() !== "IADE";
    const accountId = invoice.accountId;
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const hasProductIds = items.some((it) => it.productId);
    
    if (!isSale || !accountId || !hasProductIds) return;

    const existingTx = await Transaction.findOne({
      type: "sale",
      saleNo: invoiceNumber,
      userId,
      isDeleted: { $ne: true },
    }).lean();
    
    if (existingTx) return;

    const cari = await Cari.findById(accountId).lean();
    const accountName = cari ? (cari.ad || cari.unvan || cari.firmaAdi || invoice.customer?.title || "") : (invoice.customer?.title || "");
    const totalTRY = Number(invoice.totals?.total ?? 0);

    const normalizedItems = items.map((i) => {
      const qty = Number(i.quantity ?? i.miktar ?? 0);
      const price = Number(i.price ?? i.birimFiyat ?? 0);
      const vatRate = Number(i.kdvOran ?? 20);
      const iskontoOrani = Number(i.iskonto ?? i.iskontoOrani ?? 0);
      
      let net = qty * price;
      if (iskontoOrani > 0) net -= (net * iskontoOrani) / 100;
      const lineTotal = net * (1 + vatRate / 100);
      
      return {
        productId: i.productId ? (mongoose.Types.ObjectId.isValid(i.productId) ? new mongoose.Types.ObjectId(i.productId) : null) : null,
        name: i.name ?? i.urunAd ?? "",
        quantity: qty,
        unitPrice: price,
        vatRate,
        total: lineTotal,
        ...(iskontoOrani > 0 && { iskontoOrani }),
      };
    }).filter((i) => i.productId);

    await Transaction.create({
      userId,
      companyId: companyId || "",
      createdBy: userId,
      type: "sale",
      saleNo: invoiceNumber,
      accountId: mongoose.Types.ObjectId.isValid(accountId) ? new mongoose.Types.ObjectId(accountId) : accountId,
      accountName,
      date: new Date(),
      paymentMethod: "open",
      note: `E-Fatura satışı (${invoiceNumber})`,
      currency: "TRY",
      fxRate: 1,
      items: normalizedItems,
      totalTRY,
      direction: "borc",
      amount: totalTRY,
    });

    const affectedIds = [];
    for (const it of items) {
      if (it.productId && mongoose.Types.ObjectId.isValid(it.productId)) {
        const qty = Number(it.quantity ?? it.miktar ?? 0);
        if (qty > 0) {
          await Product.findByIdAndUpdate(it.productId, { $inc: { stock: -qty } });
          affectedIds.push(it.productId);
        }
      }
    }
    if (affectedIds.length && companyId) {
      pushStockToMarketplaces(affectedIds, { companyId: String(companyId), userId: String(userId) });
    }
  } catch (erpErr) {
    console.error("ERP işlemi hatası:", erpErr);
  }
}