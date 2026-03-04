// 📄 /pages/api/efatura/create.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

// Basit XML escape helper
function xmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default async function handler(req, res) {
  // İzin verilen method
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: "Yalnızca POST isteği kabul edilir." });
  }

  try {
    // 🔐 JWT kontrolü (diğer API'lerle aynı mantık)
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token eksik" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Geçersiz veya süresi dolmuş token" });
    }

    const { cariId, items = [], invoiceType = "SATIS", currency = "TRY" } =
      req.body || {};

    if (!cariId) {
      return res.status(400).json({ message: "cariId zorunlu" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "En az 1 satır (items) göndermelisiniz" });
    }

    // 📦 Mongo bağlantısı
    const { db } = await connectToDatabase();

    const accountsCol = db.collection("accounts");
    const productsCol = db.collection("products");
    const efaturaCol = db.collection("efatura_invoices");

    // 👤 Cari bilgisi
    let _cariId;
    try {
      _cariId = new ObjectId(cariId);
    } catch {
      return res.status(400).json({ message: "Geçersiz cariId" });
    }

    const cari = await accountsCol.findOne({
      _id: _cariId,
      userId: decoded.userId,
    });

    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    // 🧾 Ürün bilgilerini (varsa) topla
    const productIds = items
      .map((it) => it.productId)
      .filter(Boolean)
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    let productsById = {};
    if (productIds.length > 0) {
      const products = await productsCol
        .find({ _id: { $in: productIds }, userId: decoded.userId })
        .toArray();
      products.forEach((p) => {
        productsById[p._id.toString()] = p;
      });
    }

    // 💰 Tutar hesapları + satırları hazırla
    let lineNetTotal = 0;
    let lineTaxTotal = 0;

    const lineXmlParts = items.map((it, index) => {
      const quantity = Number(it.quantity || it.adet || 0);
      const price = Number(it.price || it.fiyat || 0);
      const taxRate = Number(it.kdvOran || it.kdv || 0);

      const netAmount = quantity * price;
      const taxAmount = (netAmount * taxRate) / 100;
      const grossAmount = netAmount + taxAmount;

      lineNetTotal += netAmount;
      lineTaxTotal += taxAmount;

      const product =
        (it.productId && productsById[it.productId]) || null;

      const name =
        it.name ||
        it.urun ||
        it.urunAd ||
        (product && (product.name || product.urunAdi)) ||
        `Satır ${index + 1}`;

      return `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">${quantity.toFixed(2)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${xmlEscape(
      currency
    )}">${netAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${xmlEscape(name)}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${xmlEscape(
        currency
      )}">${price.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${xmlEscape(
        currency
      )}">${taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${xmlEscape(
          currency
        )}">${netAmount.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${xmlEscape(
          currency
        )}">${taxAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:Name>KDV</cbc:Name>
            <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
  </cac:InvoiceLine>`;
    });

    const grandTotal = lineNetTotal + lineTaxTotal;

    // 🕒 Tarih / numara
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toISOString().slice(11, 19); // HH:MM:SS

    const invoiceNumber = `FT${now
      .getFullYear()
      .toString()
      .slice(-2)}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${now
      .getDate()
      .toString()
      .padStart(2, "0")}-${now.getTime()}`;

    const profileId =
      invoiceType === "EARSIV" ? "EARSIVFATURA" : "TEMELFATURA";

    // 👤 Cari bilgilerini UBL alanlarına map'le
    const vknTckn = cari.vergiNo || "";
    const vergiDairesi = cari.vergiDairesi || "";
    const musteriUnvan = cari.ad || "";

    const cariAdresStr = [cari.adres, cari.ilce, cari.il]
      .filter(Boolean)
      .join(" ");

    // 🧾 Basit UBL 2.1 faturası (temel yapı)
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${xmlEscape(profileId)}</cbc:ProfileID>
  <cbc:ID>${xmlEscape(invoiceNumber)}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${xmlEscape(
    `${invoiceNumber}-${Math.random().toString(36).slice(2, 10)}`
  )}</cbc:UUID>
  <cbc:IssueDate>${dateStr}</cbc:IssueDate>
  <cbc:IssueTime>${timeStr}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${xmlEscape(invoiceType)}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${xmlEscape(currency)}</cbc:DocumentCurrencyCode>

  <!-- Gönderici (Sen) - Firma ayarlarından besleyebiliriz, şimdilik basit -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:Name>${xmlEscape("Kurumsal Tedarikçi")}</cbc:Name>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape("Adres Bilgisi")}</cbc:StreetName>
        <cbc:CityName>${xmlEscape("İstanbul")}</cbc:CityName>
        <cbc:Country>
          <cbc:Name>Türkiye</cbc:Name>
        </cbc:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:TaxScheme>
          <cbc:Name>Vergi Dairesi</cbc:Name>
        </cbc:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Alıcı (Cari) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:Name>${xmlEscape(musteriUnvan)}</cbc:Name>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(cariAdresStr)}</cbc:StreetName>
        <cbc:CityName>${xmlEscape(cari.il || "")}</cbc:CityName>
        <cbc:Country>
          <cbc:Name>Türkiye</cbc:Name>
        </cbc:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:TaxScheme>
          <cbc:Name>${xmlEscape(vergiDairesi || "Vergi Dairesi")}</cbc:Name>
        </cbc:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyIdentification>
        <cbc:ID>${xmlEscape(vknTckn)}</cbc:ID>
      </cac:PartyIdentification>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- KDV Toplam -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${xmlEscape(
      currency
    )}">${lineTaxTotal.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>

  <!-- Genel Toplam -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${xmlEscape(
      currency
    )}">${lineNetTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${xmlEscape(
      currency
    )}">${lineNetTotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${xmlEscape(
      currency
    )}">${grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${xmlEscape(
      currency
    )}">${grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Satırlar -->
  ${lineXmlParts.join("\n")}
</Invoice>`;

    // 💾 XML'i dosyaya kaydet
    const faturalarDir = path.join(process.cwd(), "public", "faturalar");
    if (!fs.existsSync(faturalarDir)) {
      fs.mkdirSync(faturalarDir, { recursive: true });
    }

    const safeCariName = (cari.ad || "cari")
      .toLowerCase()
      .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ ]/gi, "")
      .replace(/\s+/g, "-");

    const fileName = `efatura-${safeCariName}-${Date.now()}.xml`;
    const filePath = path.join(faturalarDir, fileName);

    fs.writeFileSync(filePath, xmlContent, { encoding: "utf8" });

    // 📚 DB'ye log kaydı
    await efaturaCol.insertOne({
      userId: decoded.userId,
      cariId: _cariId,
      invoiceNumber,
      invoiceType,
      currency,
      lineNetTotal,
      lineTaxTotal,
      grandTotal,
      fileName,
      filePath,
      createdAt: new Date(),
    });

    // 🎉 Yanıt
    return res.status(200).json({
      success: true,
      message: "e-Fatura XML başarıyla oluşturuldu.",
      invoiceNumber,
      currency,
      netTotal: lineNetTotal,
      taxTotal: lineTaxTotal,
      grandTotal,
      fileUrl: `/faturalar/${fileName}`,
    });
  } catch (err) {
    console.error("❌ e-Fatura oluşturma hatası:", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
