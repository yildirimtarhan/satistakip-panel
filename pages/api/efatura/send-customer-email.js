// 📁 /pages/api/efatura/send-customer-email.js – Faturayı müşteri e-postasına PDF ile gönder
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { sendMail } from "@/lib/mail/sendMail";
import { createUbl } from "@/lib/efatura/createUbl";
import { createUblZip } from "@/lib/efatura/createUblZip";
import puppeteer from "puppeteer";

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

    const { draftId, sentId, attachPdf = true } = req.body || {};
    const { db } = await connectToDatabase();

    let doc = null;
    let cariAd = "";
    let toplam = "";
    let faturaNo = "";
    let uuid = "";

    // Taslak veya gönderilmiş faturayı bul
    if (draftId) {
      doc = await db.collection("efatura_drafts").findOne({
        _id: new ObjectId(draftId),
        userId: String(decoded.userId),
      });
      if (doc) {
        cariAd = doc.customer?.title || "Müşteri";
        toplam = doc.totals?.total != null ? `₺${Number(doc.totals.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "";
        faturaNo = doc.invoiceNumber || "Taslak";
        uuid = doc.uuid;
      }
    } else if (sentId) {
      doc = await db.collection("efatura_sent").findOne({
        _id: new ObjectId(sentId),
      });
      if (doc) {
        cariAd = doc.customer?.title || doc.cariAd || "Müşteri";
        toplam = doc.totals?.total != null ? `₺${Number(doc.totals.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : (doc.toplam != null ? `₺${Number(doc.toplam).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "");
        faturaNo = doc.invoiceNumber || doc.invoiceNo || doc._id.toString();
        uuid = doc.uuid;
      }
    }

    if (!doc) {
      return res.status(404).json({ message: "Fatura bulunamadı" });
    }

    const email = doc.customer?.email || doc.customer?.eposta || "";
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Bu fatura için müşteri e-posta adresi yok. Caride e-posta giriniz." });
    }

    // Firma ayarlarını al
    const companyQuery = decoded.companyId 
      ? { $or: [{ companyId: String(decoded.companyId) }, { userId: String(decoded.userId) }] }
      : { userId: String(decoded.userId) };
    
    const company = await db.collection("company_settings").findOne(companyQuery) || {};

    let attachments = [];

    // PDF oluştur ve ekle
    if (attachPdf) {
      try {
        const pdfBuffer = await generatePdfFromInvoice(doc, company, token);
        if (pdfBuffer) {
          attachments.push({
            filename: `${faturaNo}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          });
        }
      } catch (pdfErr) {
        console.error("PDF oluşturma hatası:", pdfErr);
        // PDF hatası durumunda e-posta göndermeye devam et (attachments boş kalabilir)
      }
    }

    const firmaAdi = company.firmaAdi || process.env.SMTP_FROM_NAME || "Satış Takip ERP";
    const subject = `Faturanız: ${faturaNo} - ${firmaAdi}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a8a;">Sayın ${cariAd},</h2>
        <p>Aşağıdaki e-fatura tarafınıza iletilmiştir:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc;">
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Fatura No:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">${faturaNo}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Fatura Tarihi:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">${doc.issueDate || new Date().toLocaleDateString('tr-TR')}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Toplam Tutar:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #dc2626;">${toplam}</td>
          </tr>
        </table>

        ${attachments.length > 0 ? '<p>📎 Faturanız PDF formatında ektedir.</p>' : '<p>💻 Faturanızı panelden görüntüleyebilirsiniz.</p>'}
        
        <p style="margin-top: 30px;">İyi günler dileriz.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 12px; color: #64748b;">
          <strong>${firmaAdi}</strong><br>
          ${company.adres ? company.adres + '<br>' : ''}
          ${company.telefon ? 'Tel: ' + company.telefon + '<br>' : ''}
          ${company.eposta ? 'E-posta: ' + company.eposta : ''}
        </div>
      </div>
    `;
    
    const text = `Sayın ${cariAd}, Fatura No: ${faturaNo}, Toplam: ${toplam}. ${firmaAdi}`;

    await sendMail({ 
      to: email.trim(), 
      subject, 
      html, 
      text,
      attachments 
    });

    return res.status(200).json({
      success: true,
      message: `E-posta ${email} adresine gönderildi.`,
      hasPdf: attachments.length > 0
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

// PDF oluşturma fonksiyonu
async function generatePdfFromInvoice(doc, company, token) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    
    // Önizleme sayfasına git
    const previewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/efatura/onizleme?id=${doc._id}`;
    
    await page.setExtraHTTPHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    await page.goto(previewUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // PDF oluştur
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '20px', 
        right: '20px', 
        bottom: '20px', 
        left: '20px' 
      }
    });
    
    return pdfBuffer;
    
  } finally {
    await browser.close();
  }
}