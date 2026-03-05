import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createUbl } from "@/lib/efatura/createUbl";
import { createUblZip } from "@/lib/efatura/createUblZip";
import { formatEfaturaInvoiceNo } from "@/lib/efatura/nextInvoiceNumber";
import axios from "axios";
import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import Cari from "@/models/Cari";
import Counter from "@/models/Counter";

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Token gerekli" });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Geçersiz token" });
    }
    const userId = String(decoded.userId || decoded._id || decoded.id || "");
    const companyId = decoded.companyId ? String(decoded.companyId) : null;

    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ error: "invoiceId gerekli" });

    // Taslak faturayı al (kullanıcıya ait olmalı)
    const invoice = await db.collection("efatura_drafts").findOne({
      _id: new ObjectId(invoiceId),
    });
    if (!invoice) return res.status(404).json({ error: "Taslak bulunamadı" });

    // Her firma kendi company_settings kaydını kullanır (multi-tenant)
    const companyQuery = companyId
      ? { $or: [{ companyId }, { userId: userId }] }
      : { userId: userId };
    const company = await db.collection("company_settings").findOne(companyQuery);
    if (!company) return res.status(400).json({ error: "Firma ayarları eksik. Lütfen E-Fatura başvurusu yapıp onay alın veya firma ayarlarınızı doldurun." });

    // Taslakta yoksa sıralı fatura numarası ata – ERP tek kaynak (KT formatı, Taxten'e bu numara gider)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    let invoiceNumber = invoice.invoiceNumber ? String(invoice.invoiceNumber).trim() : "";
    const prefix = company.efaturaFaturaNoPrefix || "KT";
    if (!invoiceNumber) {
      await dbConnect();
      const year = now.getFullYear();
      const companyIdForCounter = companyId || userId;
      const companyIdObj = mongoose.Types.ObjectId.isValid(companyIdForCounter)
        ? new mongoose.Types.ObjectId(companyIdForCounter)
        : companyIdForCounter;
      const counter = await Counter.findOneAndUpdate(
        { key: "efaturaNo", companyId: companyIdObj, year },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      invoiceNumber = formatEfaturaInvoiceNo(prefix, year, now.getMonth() + 1, counter.seq);
    }
    const invoiceForUbl = {
      ...invoice,
      invoiceNumber,
      issueDate: invoice.issueDate || dateStr,
    };

    // createUbl beklediği alan adları: title, vkn/vknTckn, taxOffice, street, phone, email, website
    const companyForUbl = {
      ...company,
      title: company.firmaAdi || company.title || company.companyTitle || "",
      vkn: company.vergiNo || company.vkn,
      vknTckn: company.vergiNo || company.vknTckn,
      taxOffice: company.vergiDairesi || company.taxOffice,
      street: company.adres || company.street,
      phone: company.telefon || company.phone,
      email: company.eposta || company.email,
      website: company.web || company.website,
    };
    const xml = createUbl(invoiceForUbl, companyForUbl);

    // 2) ZIP oluştur (Taxten: zip içindeki tek XML dosyasının adı UUID ile aynı olmalı)
    const zipBuffer = createUblZip(xml, invoice.uuid);
    const zipBase64 = zipBuffer.toString("base64");

    // 3) Taxten API – Test (devrest) / Canlı (rest). Varsayılan: test (taxtenTestMode === false yoksa test)
    const isTestMode = company.taxtenTestMode !== false;
    const baseUrl = isTestMode
      ? "https://devrest.taxten.com/api/v1"
      : "https://rest.taxten.com/api/v1";
    const isEarsiv =
      (invoice.invoiceType || "").toUpperCase().includes("EARSIV") ||
      (invoiceForUbl.invoiceType || "").toUpperCase().includes("EARSIV");
    const apiUrl = isEarsiv
      ? `${baseUrl}/EArchiveInvoice/SendUbl`
      : `${baseUrl}/Invoice/SendUbl`;

    // Taxten kimlik: firma başına ClientId+ApiKey (onay sonrası) veya tek hesap için taxtenUsername:taxtenPassword
    const useClientId = company.efatura?.taxtenClientId && company.efatura?.taxtenApiKey;
    const headers = {
      "Content-Type": "application/json",
    };
    if (useClientId) {
      headers["x-client-id"] = company.efatura.taxtenClientId;
      headers["x-api-key"] = company.efatura.taxtenApiKey;
    } else if (company.taxtenUsername && company.taxtenPassword) {
      headers.Authorization = `Basic ${Buffer.from(`${company.taxtenUsername}:${company.taxtenPassword}`).toString("base64")}`;
    } else {
      return res.status(400).json({
        error: "Bu firma için Taxten API bilgisi yok. E-Fatura başvurunuzun onaylanması veya firma ayarlarına Taxten kullanıcı adı/şifre girilmesi gerekir.",
      });
    }

    // Alıcı VKN/TCKN: Taxten zarfsız gönderimde ReceiverIdentifier zorunlu
    const receiverIdentifier =
      invoice.customer.vknTckn ||
      invoice.customer.identifier ||
      invoice.customer.vkn ||
      "";

    if (!receiverIdentifier) {
      return res.status(400).json({
        error: "Taslakta alıcı VKN/TCKN (customer.vknTckn veya identifier) eksik",
      });
    }

    const senderVkn = company.vergiNo || company.vkn || company.vknTckn || "";
    if (!senderVkn) {
      return res.status(400).json({ error: "Firma ayarlarında VKN/TCKN (vergiNo) eksik" });
    }

    // Taxten SendUbl isteği: VKN_TCKN, SenderIdentifier, ReceiverIdentifier, DocType, Parameters, DocData
    const payload = {
      vkN_TCKN: senderVkn,
      senderIdentifier: company.senderIdentifier || senderVkn,
      receiverIdentifier,
      docType: "INVOICE",
      parameters: [],
      docData: zipBase64,
    };

    // E-Arşiv dokümanına göre Branch ve OutputType (PDF/HTML) eklenir
    if (isEarsiv) {
      payload.Branch = company.taxtenBranch || company.branch || "";
      payload.OutputType = company.taxtenOutputType || "PDF";
    }

    const response = await axios.post(apiUrl, payload, { headers });

    // 4) Gönderilen faturaya kaydet (fatura no atanmış haliyle)
    const sentDoc = {
      ...invoice,
      invoiceNumber: invoiceForUbl.invoiceNumber,
      invoiceNo: invoiceForUbl.invoiceNumber,
      faturaNo: invoiceForUbl.invoiceNumber,
      response: response.data,
      sentAt: new Date(),
    };
    await db.collection("efatura_sent").insertOne(sentDoc);

    // 5) Taslağı güncelle: atanan fatura numarası ERP'de kalır (Taxten ile senkron)
    await db.collection("efatura_drafts").updateOne(
      { _id: new ObjectId(invoiceId) },
      { $set: { invoiceNumber: invoiceForUbl.invoiceNumber, issueDate: dateStr, updatedAt: new Date() } }
    );

    // 6) Canlıda kesilen fatura: cariye borç hareketi + stok düşümü (sadece satış, İade hariç)
    const isSale = (invoice.invoiceType || invoice.tip || "").toUpperCase() !== "IADE";
    const accountId = invoice.accountId;
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const hasProductIds = items.some((it) => it.productId);
    if (isSale && accountId && hasProductIds) {
      try {
        await dbConnect();
        const saleNo = invoiceForUbl.invoiceNumber || sentDoc._id?.toString() || `EF-${Date.now()}`;
        const existingTx = await Transaction.findOne({
          type: "sale",
          saleNo,
          userId,
          isDeleted: { $ne: true },
        }).lean();
        if (!existingTx) {
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
            saleNo,
            accountId: mongoose.Types.ObjectId.isValid(accountId) ? new mongoose.Types.ObjectId(accountId) : accountId,
            accountName,
            date: new Date(),
            paymentMethod: "open",
            note: "E-Fatura satışı",
            currency: "TRY",
            fxRate: 1,
            items: normalizedItems,
            totalTRY,
            direction: "borc",
            amount: totalTRY,
          });
          for (const it of items) {
            if (it.productId && mongoose.Types.ObjectId.isValid(it.productId)) {
              const qty = Number(it.quantity ?? it.miktar ?? 0);
              if (qty > 0) {
                await Product.findByIdAndUpdate(it.productId, { $inc: { stock: -qty } });
              }
            }
          }
        }
      } catch (erpErr) {
        console.error("E-Fatura cari/stok işlemi hatası (fatura yine gönderildi):", erpErr);
      }
    }

    return res.status(200).json({
      message: "Fatura başarıyla gönderildi",
      result: response.data,
    });
  } catch (err) {
    console.error("SEND ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
