// 📁 /pages/api/efatura/send.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST desteklenir" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const drafts = db.collection("efatura_drafts");
    const sent = db.collection("efatura_sent");

    const { draftId } = req.body;

    if (!draftId) {
      return res.status(400).json({ message: "draftId eksik" });
    }

    // 📌 Taslak Faturayı Bul
    const draft = await drafts.findOne({ _id: new ObjectId(draftId) });
    if (!draft) {
      return res.status(404).json({ message: "Taslak bulunamadı" });
    }

    // ===========================================
    // 📌 MOCK GÖNDERİM — Gerçek API Buraya Bağlanacak
    // ===========================================
    const now = new Date();
    const fakeInvoiceNumber = "ST-" + now.getTime(); // ör: ST-1700000000000

    const sentInvoice = {
      ...draft,
      durum: "Gönderildi",
      sentAt: now,
      invoiceNumber: fakeInvoiceNumber,
    };

    // 📌 Taslağı sil – Gönderilmiş tablosuna ekle
    await drafts.deleteOne({ _id: new ObjectId(draftId) });
    await sent.insertOne(sentInvoice);

    return res.status(200).json({
      message: "Fatura başarıyla gönderildi (MOCK)",
      invoiceNumber: fakeInvoiceNumber,
      sentAt: now,
    });
  } catch (err) {
    console.error("E-Fatura Gönderim Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
