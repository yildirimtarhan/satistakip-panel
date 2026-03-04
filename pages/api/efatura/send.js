import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createUbl } from "@/lib/efatura/createUbl";
import { createUblZip } from "@/lib/efatura/createUblZip";
import axios from "axios";

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ error: "invoiceId gerekli" });

    // Taslak faturayı al
    const invoice = await db.collection("efatura_drafts").findOne({
      _id: new ObjectId(invoiceId),
    });

    if (!invoice) return res.status(404).json({ error: "Taslak bulunamadı" });

    // Firma bilgilerini al
    const company = await db.collection("company_settings").findOne({
      userId: "global",
    });

    if (!company) return res.status(400).json({ error: "Firma ayarları eksik" });

    // Taslakta yoksa fatura no ve tarih üret (createUbl bunları bekliyor)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const invoiceForUbl = {
      ...invoice,
      invoiceNumber:
        invoice.invoiceNumber ||
        `FT${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${now.getTime()}`,
      issueDate: invoice.issueDate || dateStr,
    };

    // 1) UBL XML oluştur
    const xml = createUbl(invoiceForUbl, company);

    // 2) ZIP oluştur (Taxten: zip içindeki tek XML dosyasının adı UUID ile aynı olmalı)
    const zipBuffer = createUblZip(xml, invoice.uuid);
    const zipBase64 = zipBuffer.toString("base64");

    // 3) Taxten API – E-Fatura vs E-Arşiv farklı endpoint (Taxten REST API dokümanı)
    const baseUrl = company.taxtenTestMode
      ? "https://devrest.taxten.com/api/v1"
      : "https://rest.taxten.com/api/v1";
    const isEarsiv =
      (invoice.invoiceType || "").toUpperCase().includes("EARSIV") ||
      (invoiceForUbl.invoiceType || "").toUpperCase().includes("EARSIV");
    const apiUrl = isEarsiv
      ? `${baseUrl}/EArchiveInvoice/SendUbl`
      : `${baseUrl}/Invoice/SendUbl`;

    const auth = Buffer.from(
      `${company.taxtenUsername}:${company.taxtenPassword}`
    ).toString("base64");

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

    const senderVkn = company.vkn || company.vknTckn || "";
    if (!senderVkn) {
      return res.status(400).json({ error: "Firma ayarlarında VKN/TCKN (vkn veya vknTckn) eksik" });
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

    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    // 4) Gönderilen faturaya kaydet
    await db.collection("efatura_sent").insertOne({
      ...invoice,
      response: response.data,
      sentAt: new Date(),
    });

    return res.status(200).json({
      message: "Fatura başarıyla gönderildi",
      result: response.data,
    });
  } catch (err) {
    console.error("SEND ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
