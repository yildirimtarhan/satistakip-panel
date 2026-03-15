import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createUbl } from "@/lib/efatura/createUbl";
import { createUblZip } from "@/lib/efatura/createUblZip";
import { getKontorUsed } from "@/lib/efatura/kontorUsage";
import { invoiceSendUbl } from "@/lib/taxten/taxtenClient";
import axios from "axios";
import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import Cari from "@/models/Cari";
import StockLog from "@/models/StockLog";
import { pushStockToMarketplaces } from "@/lib/pazaryeriStockSync";
import Counter from "@/models/Counter";
import { Types } from "mongoose";

/**
 * Taxten API Hata Kodları (E-Fatura REST API Kullanım Kılavuzu v1.0)
 */
const TAXTEN_ERROR_CODES = {
  5: "Zip boyutu aşıldı (max 5MB)",
  20: "Desteklenmeyen işlem",
  25: "Şema geçersiz (UBL-TR şema validasyonu hatası)",
  30: "VKN/TCKN e-Fatura mükellefine ait değil",
  35: "Data boyutu aşıldı",
  37: "XSLT Bulunamadı (Faturaya XSLT eklenmemiş)",
  40: "Şematron geçersiz",
  46: "e-Arşiv faturanın göndericisi geçersiz",
  50: "Rapor veri alanları hatalı/eksik",
  56: "IssueDate raporlama periyodu dışında",
  60: "Zarf database'de mevcut",
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
  3201: "Uygulama yanıtı UUID sistemde mevcut",
  3210: "Uygulama yanıtı verilen fatura bulunamadı",
  3211: "Uygulama yanıtı verilen faturanın zarfı bulunamadı",
  3215: "Fatura alıcıya ait değil",
  3216: "Fatura göndericiye ait değil",
  3220: "Uygulama yanıtı verilen fatura ticari fatura değil",
  3230: "Faturaya önceki gönderilen uygulama yanıtı sonuçlanmamış",
  3240: "Fatura geliş tarihi 8 günü geçtiği için yanıt verilemez",
  3410: "UUID'ye ait fatura bulunmadı",
  3420: "CustInvID'ye ait fatura bulunmadı",
  3430: "Fatura gönderilen VKN ve etikete ait değil",
  3440: "Fatura görüntüsü doküman türü desteklenmiyor",
  3450: "Fatura görüntüsü oluşturulamadı",
  3610: "UUID'ye ait belge bulunmadı",
  3630: "UBL gönderilen VKN/TCKN ve etikete ait değil",
  3910: "UUID'ye ait belge bulunamadı",
  3920: "Belge gönderilen VKN/TCKN ve etikete ait değil",
  3950: "UUID'ye ait zarf bulunamadı",
  3960: "Zarf gönderilen VKN/TCKN ve etikete ait değil",
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

    const { invoiceId, sentId, isDraft = false, resend = false, resendEnvUuid = null } = req.body;
    if (!invoiceId && !sentId) {
      return res.status(400).json({ error: "invoiceId veya sentId gerekli" });
    }

    // Tenant Filter
    const tenantFilter = companyId ? { companyId } : { userId };

    let invoice;
    let fromSentResend = false;
    let resendEnvUuidUse = resendEnvUuid;

    if (sentId) {
      // Tekrar gönderim: gönderilen kayıttan (efatura_sent) – 2.1.8
      invoice = await db.collection("efatura_sent").findOne({
        _id: new ObjectId(sentId),
        ...tenantFilter,
      });
      if (!invoice) return res.status(404).json({ error: "Gönderilen fatura bulunamadı" });
      fromSentResend = true;
      resendEnvUuidUse = invoice.envUuid || invoice.taxtenResponse?.EnvUUID || resendEnvUuid;
    } else {
      invoice = await db.collection("efatura_drafts").findOne({
        _id: new ObjectId(invoiceId),
        ...tenantFilter,
      });
      if (!invoice) return res.status(404).json({ error: "Taslak fatura bulunamadı" });
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

    // Kontör kontrolü (sadece gerçek gönderimde – taslakta kontör düşmez)
    // Giden + gelen tüm belgeler (E-Fatura, E-Arşiv, E-İrsaliye) kontör düşer
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
        const remaining = limit - used;
        if (remaining <= 0) {
          return res.status(402).json({
            error: "E-Belge kontörünüz tükenmiştir. Fatura kesebilmek için limit güncellemesi yapın.",
            used,
            limit,
          });
        }
      }
    }

    // Fatura Numarası ve CustInvID (Taxten: otomatik ID’de CustInvID zorunlu, max 64 karakter, aynı CustInvID = aynı fatura ID / tekrar gönderim)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    let invoiceNumber = invoice.invoiceNumber || invoice.faturaNo || invoice.invoiceNo
      ? String(invoice.invoiceNumber || invoice.faturaNo || invoice.invoiceNo).trim() : "";
    let custInvId = invoice.custInvId ? String(invoice.custInvId).slice(0, 64) : null;

    const prefix = company.efaturaFaturaNoPrefix || "KT";
    const useAutoId = company.efaturaAutoId === true;

    if (fromSentResend) {
      if (!invoiceNumber) invoiceNumber = "AUTO";
    } else if (!invoiceNumber) {
      await dbConnect();
      const year = now.getFullYear();
      const companyIdForCounter = companyId || userId;
      const companyIdObj = mongoose.Types.ObjectId.isValid(companyIdForCounter)
        ? new mongoose.Types.ObjectId(companyIdForCounter)
        : companyIdForCounter;

      if (useAutoId) {
        // Taxten otomatik fatura ID: CustInvID zorunlu, GB etiketi + VKN çifti için tekil, tekrar gönderimde aynı ID için aynı CustInvID kullanılır
        if (!custInvId) {
          const counter = await Counter.findOneAndUpdate(
            { key: "efaturaNo", companyId: companyIdObj, year },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
          );
          custInvId = `${prefix}-${year}-${String(counter.seq).padStart(6, "0")}`.slice(0, 64);
        }
        invoiceNumber = "AUTO";
      } else {
        const counter = await Counter.findOneAndUpdate(
          { key: "efaturaNo", companyId: companyIdObj, year },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        invoiceNumber = `${prefix}-${year}-${String(counter.seq).padStart(6, "0")}`;
      }
    }

    // E-Fatura mı E-Arşiv mi? (e-Fatura: SATIS/IADE | e-Arşiv: EARSIVFATURA – GİB kod listesi)
    const rawInvType = String(invoice.invoiceType || "").trim().toUpperCase();
    const isEarsiv = rawInvType === "EARSIV" || rawInvType === "EARSIVFATURA" || rawInvType.includes("EARSIV");
    const invoiceTypeForUbl = isEarsiv
      ? "EARSIVFATURA"
      : (invoice.invoiceType === "IADE" ? "IADE" : "SATIS");

    // Geçerli UUID (e-Fatura şematron 8-4-4-4-12 formatı ister). Tekrar gönderimde (2.1.8) zarf/fatura UUID yeniden oluşturulmalı.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const doResend = resend || fromSentResend;
    const validUuid = doResend
      ? require("crypto").randomUUID()
      : (invoice.uuid && uuidRegex.test(String(invoice.uuid).trim())
          ? String(invoice.uuid).trim().toLowerCase()
          : require("crypto").randomUUID());

    // UBL XML Oluştur
    const invoiceForUbl = {
      ...invoice,
      uuid: validUuid,
      invoiceNumber,
      issueDate: invoice.issueDate || dateStr,
      invoiceType: invoiceTypeForUbl,
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
      postalZone: company.postaKodu || company.postalZone || "",
      region: company.bolge || company.region || "",
      phone: company.telefon || company.phone || "",
      email: company.eposta || company.email || "",
      website: company.web || company.website || "",
      country: company.ulke || company.country || "Türkiye",
      logo: company.logo || "",
      imza: company.imza || "",
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
      zipBuffer = createUblZip(xml, invoiceForUbl.uuid);
    } catch (zipErr) {
      console.error("ZIP oluşturma hatası:", zipErr);
      return res.status(500).json({
        error: "ZIP dosyası oluşturulurken hata oluştu",
        details: zipErr.message,
      });
    }
    
    const zipBase64 = zipBuffer.toString("base64");

    // Taxten API: E-Fatura = /Invoice/SendUbl (PascalCase), E-Arşiv = /EArchiveInvoice/SendUbl
    const isTestMode = company.taxtenTestMode !== false;
    const senderVkn = company.vergiNo || company.vkn || "";
    const receiverVkn = invoice.customer?.vknTckn || invoice.customer?.vkn || invoice.customer?.identifier || "";

    if (!receiverVkn) {
      return res.status(400).json({
        error: "Alıcı VKN/TCKN eksik. Müşteri kartında vergi numarası tanımlanmalı.",
      });
    }

    // Taxten kimlik kontrolü
    const clientId = (company.efatura?.taxtenClientId || company.taxtenClientId || "").toString().trim();
    const apiKey = (company.efatura?.taxtenApiKey || company.taxtenApiKey || "").toString().trim();
    const taxtenUser = (company.taxtenUsername || "").toString().trim();
    const taxtenPass = (company.taxtenPassword || "").toString().trim();
    if (!(clientId && apiKey) && !(taxtenUser && taxtenPass)) {
      return res.status(400).json({
        error: "Taxten API bilgisi eksik. ClientId+ApiKey veya Kullanıcı adı+Şifre girilmeli.",
      });
    }

    let taxtenResponse;

    if (isEarsiv) {
      // E-Arşiv: EArchiveInvoice/SendUbl (mevcut axios çağrısı)
      const baseUrl = isTestMode ? "https://devrest.taxten.com/api/v1" : "https://rest.taxten.com/api/v1";
      const apiUrl = `${baseUrl}/EArchiveInvoice/SendUbl`;
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (clientId && apiKey) {
        headers["x-client-id"] = clientId;
        headers["x-api-key"] = apiKey;
      } else {
        headers.Authorization = `Basic ${Buffer.from(`${taxtenUser}:${taxtenPass}`).toString("base64")}`;
      }
      const payload = {
        VKN_TCKN: senderVkn,
        DocType: "INVOICE",
        DocData: zipBase64,
        Branch: company.taxtenBranch || company.branch || "default",
        OutputType: company.taxtenOutputType || "PDF",
      };
      if (isDraft) payload.Parameters = ["IS_DRAFT"];
      try {
        taxtenResponse = await axios.post(apiUrl, payload, {
          headers,
          timeout: 300000,
          maxBodyLength: 10 * 1024 * 1024,
          maxContentLength: 10 * 1024 * 1024,
        });
      } catch (apiErr) {
        const parsedError = parseTaxtenError(apiErr);
        const status = apiErr.response?.status || 502;
        let suggestion = "Lütfen daha sonra tekrar deneyin";
        if (status === 401 || parsedError.code === 401) suggestion = "Firma Ayarları → Taxten: Test modu açıksa Taxten TEST hesap bilgileri, kapalıysa CANLI hesap bilgileri girin.";
        else if (parsedError.code === 37) suggestion = "XSLT şablonu eksik";
        else if (parsedError.code === 25) suggestion = "UBL şema hatası";
        return res.status(status).json({ error: "Taxten API hatası", message: parsedError.message, code: parsedError.code, suggestion });
      }
    } else {
      // E-Fatura: /Invoice/SendUbl – dokümana uygun PascalCase, zarfsız tek fatura (DocType: INVOICE)
      const senderIdentifier = company.senderIdentifier || `urn:mail:${company.taxtenUsername || senderVkn}`;
      const receiverIdentifier = `urn:mail:${receiverVkn}`;
      const parameters = [];
      if (isDraft) parameters.push("IS_DRAFT");
      if (doResend && resendEnvUuidUse && String(resendEnvUuidUse).trim()) parameters.push(`RESEND:${String(resendEnvUuidUse).trim()}`);
      try {
        taxtenResponse = { data: await invoiceSendUbl({
          company,
          isTest: isTestMode,
          VKN_TCKN: senderVkn,
          SenderIdentifier: senderIdentifier,
          ReceiverIdentifier: receiverIdentifier,
          DocType: "INVOICE",
          DocData: zipBase64,
          Parameters: parameters.length ? parameters : undefined,
        }) };
      } catch (apiErr) {
      console.error("Taxten API hatası:", apiErr.response?.data || apiErr.message);
      const parsedError = parseTaxtenError(apiErr);
      const status = apiErr.response?.status || 502;

      let suggestion = "Lütfen daha sonra tekrar deneyin";
      if (status === 401 || parsedError.code === 401) {
        suggestion = "Firma Ayarları → Taxten: Test modu açıksa Taxten TEST hesap bilgileri, kapalıysa CANLI hesap bilgileri girin. Kullanıcı adı/şifre veya Client ID+API Key doğru ve başında/sonunda boşluk olmamalı.";
      } else if (parsedError.code === 37) suggestion = "XSLT şablonu eksik";
      else if (parsedError.code === 25) suggestion = "UBL şema hatası";
      else if (parsedError.code === 1100) suggestion = "GİB kaydı bulunamadı";

      return res.status(status).json({
        error: "Taxten API hatası",
        message: parsedError.message,
        code: parsedError.code,
        suggestion,
      });
      }
    }

    // Taxten cevabı tek nesne veya dizi olabilir (zarflı çoklu fatura)
    const rawData = taxtenResponse.data;
    const responseData = Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : rawData;
    // E-Arşiv: EnvelopeId, DocumentId, InvoiceUUID, InvoiceNumber | E-Fatura: EnvUUID, UUID, ID (PascalCase)
    const finalInvoiceNumber = responseData?.invoiceNumber || responseData?.InvoiceNumber || responseData?.id || responseData?.ID || responseData?.CustInvID || responseData?.Status || invoiceNumber;
    const docUuid = responseData?.uuid || responseData?.UUID || responseData?.InvoiceUUID || responseData?.documentId || responseData?.DocumentId || invoice.uuid;
    const envUuidVal = responseData?.envUuid || responseData?.EnvUUID || responseData?.envelopeId || responseData?.EnvelopeId || null;

    // Gönderilen Faturayı Kaydet
    const sentDoc = {
      ...invoice,
      invoiceNumber: finalInvoiceNumber,
      invoiceNo: finalInvoiceNumber,
      faturaNo: finalInvoiceNumber,
      uuid: docUuid,
      envUuid: envUuidVal,
      taxtenResponse: responseData,
      sentAt: new Date(),
      status: isDraft ? "draft" : "sent",
      isEarsiv,
      userId,
      companyId: companyId || null,
    };

    await db.collection("efatura_sent").insertOne(sentDoc);

    // Taslağı Güncelle (otomatik ID’de CustInvID saklanır; tekrar gönderimde aynı fatura ID alınır)
    if (!fromSentResend && invoiceId) {
      const draftUpdate = {
        invoiceNumber: finalInvoiceNumber,
        issueDate: dateStr,
        status: isDraft ? "draft" : "sent",
        taxtenUuid: docUuid,
        updatedAt: new Date(),
      };
      if (custInvId) draftUpdate.custInvId = custInvId;
      await db.collection("efatura_drafts").updateOne(
        { _id: new ObjectId(invoiceId), ...tenantFilter },
        { $set: draftUpdate }
      );
    }

    // ERP İşlemleri (yalnızca ilk gönderimde; tekrar gönderimde atlanır)
    if (!isDraft && !fromSentResend) {
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

/**
 * Fatura kesildiğinde: Cari hareket, stok düşümü, cari bakiye güncellemesi.
 * Multi-tenant uyumlu (companyId ile filtre).
 */
async function processErpTransactions(invoice, invoiceNumber, userId, companyId) {
  try {
    await dbConnect();

    const isSale = (invoice.invoiceType || "").toUpperCase() !== "IADE";
    const accountId = invoice.accountId;
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const hasProductIds = items.some((it) => it.productId);

    if (!isSale || !accountId || !hasProductIds) return;

    // Multi-tenant: mevcut işlem kontrolü
    const txMatch = {
      type: "sale",
      saleNo: invoiceNumber,
      isDeleted: { $ne: true },
    };
    if (companyId) txMatch.$or = [{ companyId: String(companyId) }, { companyId: new Types.ObjectId(companyId) }];
    else txMatch.userId = userId;
    const existingTx = await Transaction.findOne(txMatch).lean();
    if (existingTx) return;

    // Cari – multi-tenant: companyId veya userId ile eşleşmeli
    const cariQuery = { _id: Types.ObjectId.isValid(accountId) ? new Types.ObjectId(accountId) : accountId };
    if (companyId) {
      const uid = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
      cariQuery.$or = [
        { companyId: new Types.ObjectId(companyId) },
        { companyId: String(companyId) },
        { userId: uid },
        { companyId: { $exists: false } },
      ];
    } else {
      cariQuery.userId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    }
    const cari = await Cari.findOne(cariQuery).lean();
    if (!cari) return;
    const accountName = cari.ad || cari.unvan || cari.firmaAdi || invoice.customer?.title || "";
    const totalTRY = Number(invoice.totals?.total ?? 0);

    const normalizedItems = items
      .map((i) => {
        const qty = Number(i.quantity ?? i.miktar ?? 0);
        const price = Number(i.price ?? i.birimFiyat ?? 0);
        const vatRate = Number(i.kdvOran ?? 20);
        const iskontoOrani = Number(i.iskonto ?? i.iskontoOrani ?? 0);
        let net = qty * price;
        if (iskontoOrani > 0) net -= (net * iskontoOrani) / 100;
        const lineTotal = net * (1 + vatRate / 100);
        const pid = i.productId && Types.ObjectId.isValid(i.productId) ? new Types.ObjectId(i.productId) : null;
        if (!pid) return null;
        return {
          productId: pid,
          name: i.name ?? i.urunAd ?? "",
          quantity: qty,
          unitPrice: price,
          vatRate,
          total: lineTotal,
        };
      })
      .filter(Boolean);

    const companyIdObj = companyId ? (Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId) : null;
    const accountIdObj = Types.ObjectId.isValid(accountId) ? new Types.ObjectId(accountId) : accountId;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1) Stok düşümü – multi-tenant (companyId/userId) + yetersiz stok kontrolü
      for (const it of normalizedItems) {
        const prodFilter = { _id: it.productId, stock: { $gte: it.quantity } };
        if (companyId) {
          prodFilter.$or = [
            { companyId: new Types.ObjectId(companyId) },
            { companyId: String(companyId) },
          ];
        } else {
          prodFilter.userId = userId;
        }
        const updated = await Product.findOneAndUpdate(prodFilter, { $inc: { stock: -it.quantity } }, { new: true, session });
        if (!updated) throw new Error(`Yetersiz stok veya ürün bulunamadı: ${it.name || it.productId}`);
      }

      // 2) Cari hareket (Transaction)
      await Transaction.create(
        [
          {
            userId,
            companyId: companyId || "",
            createdBy: userId,
            type: "sale",
            saleNo: invoiceNumber,
            accountId: accountIdObj,
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
          },
        ],
        { session }
      );

      // 3) Cari bakiye güncellemesi (satış = borç = bakiye artar)
      const cariUpdateFilter = { _id: accountIdObj };
      if (companyId) {
        cariUpdateFilter.$or = [
          { companyId: companyIdObj },
          { companyId: String(companyId) },
          { companyId: { $exists: false } },
        ];
      } else {
        cariUpdateFilter.userId = userId;
      }
      await Cari.updateOne(
        cariUpdateFilter,
        { $inc: { bakiye: totalTRY, totalSales: totalTRY }, $set: { updatedAt: new Date() } },
        { session }
      );

      // 4) Stok log (opsiyonel – takip için)
      for (const it of normalizedItems) {
        await StockLog.create(
          [
            {
              productId: it.productId,
              accountId: accountIdObj,
              type: "sale",
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              total: it.total,
              currency: "TRY",
              fxRate: 1,
              totalTRY: it.total,
              createdAt: new Date(),
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();
    } catch (txErr) {
      await session.abortTransaction();
      throw txErr;
    } finally {
      session.endSession();
    }

    // Pazaryeri stok senkronizasyonu (transaction dışında)
    const affectedIds = normalizedItems.map((i) => i.productId).filter(Boolean);
    if (affectedIds.length && companyId) {
      pushStockToMarketplaces(affectedIds, { companyId: String(companyId), userId: String(userId) });
    }
  } catch (erpErr) {
    console.error("ERP işlemi hatası:", erpErr);
  }
}