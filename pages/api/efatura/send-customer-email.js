// 📁 /pages/api/efatura/send-customer-email.js – Faturayı müşteri e-postasına gönder
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { sendMail } from "@/lib/mail/sendMail";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST" });
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

    const { draftId, sentId } = req.body || {};
    const { db } = await connectToDatabase();

    let doc = null;
    let cariAd = "";
    let toplam = "";
    let faturaNo = "";

    if (draftId) {
      doc = await db.collection("efatura_drafts").findOne({
        _id: new ObjectId(draftId),
        userId: String(decoded.userId),
      });
      if (doc) {
        cariAd = doc.customer?.title || "Müşteri";
        toplam = doc.totals?.total != null ? `₺${Number(doc.totals.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "";
        faturaNo = doc.invoiceNumber || "Taslak";
      }
    } else if (sentId) {
      doc = await db.collection("efatura_sent").findOne({
        _id: new ObjectId(sentId),
      });
      if (doc) {
        cariAd = doc.customer?.title || doc.cariAd || "Müşteri";
        toplam = doc.totals?.total != null ? `₺${Number(doc.totals.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : (doc.toplam != null ? `₺${Number(doc.toplam).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "");
        faturaNo = doc.invoiceNumber || doc.invoiceNo || doc._id.toString();
      }
    }

    if (!doc) {
      return res.status(404).json({ message: "Fatura bulunamadı" });
    }

    const email = doc.customer?.email || doc.customer?.eposta || "";
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Bu fatura için müşteri e-posta adresi yok. Caride e-posta giriniz." });
    }

    const firmaAdi = process.env.SMTP_FROM_NAME || "Satış Takip ERP";
    const subject = `Faturanız: ${faturaNo} - ${firmaAdi}`;
    const html = `
      <p>Sayın ${cariAd},</p>
      <p><strong>Fatura No:</strong> ${faturaNo}</p>
      <p><strong>Toplam:</strong> ${toplam}</p>
      <p>Faturanız ektedir veya panelden görüntüleyebilirsiniz.</p>
      <p>İyi günler dileriz.<br/>${firmaAdi}</p>
    `;
    const text = `Sayın ${cariAd}, Fatura No: ${faturaNo}, Toplam: ${toplam}. ${firmaAdi}`;

    await sendMail({ to: email.trim(), subject, html, text });

    return res.status(200).json({
      success: true,
      message: `E-posta ${email} adresine gönderildi.`,
    });
  } catch (err) {
    const msg = err?.message || "";
    if (msg.includes("BREVO_API_KEY") || msg.includes("SMTP_FROM_EMAIL") || msg.includes("env eksik")) {
      return res.status(503).json({
        message: "E-posta servisi yapılandırılmamış. BREVO_API_KEY ve SMTP_FROM_EMAIL .env dosyasında tanımlı olmalı.",
      });
    }
    console.error("E-Fatura müşteri mail hatası:", err);
    return res.status(500).json({ message: err.message || "E-posta gönderilemedi" });
  }
}
