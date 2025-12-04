import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createUbl } from "@/lib/efatura/createUbl";
import { createUblZip } from "@/lib/efatura/createUblZip";
import axios from "axios";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("satistakip");

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

    // 1) UBL XML oluştur
    const xml = createUbl(invoice, company);

    // 2) ZIP oluştur
    const zipBuffer = createUblZip(xml, invoice.uuid);
    const zipBase64 = zipBuffer.toString("base64");

    // 3) Taxten API çağrısı
    const apiUrl = company.taxtenTestMode
      ? "https://devrest.taxten.com/api/v1/Invoice/SendUbl"
      : "https://rest.taxten.com/api/v1/Invoice/SendUbl";

    const auth = Buffer.from(
      `${company.taxtenUsername}:${company.taxtenPassword}`
    ).toString("base64");

    const payload = {
      vkN_TCKN: company.vkn,
      senderIdentifier: company.senderIdentifier,
      receiverIdentifier: invoice.customer.identifier,
      docType: "INVOICE",
      parameters: [],
      docData: zipBase64,
    };

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
