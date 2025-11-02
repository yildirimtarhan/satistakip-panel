// /pages/api/teklif/mail.js
import nodemailer from "nodemailer";
import { ObjectId } from "mongodb";
import { getTeklifCollection } from "@/models/Teklif";

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,          // smtp.zoho.eu
    port: Number(process.env.SMTP_PORT),  // 465
    secure: true,
    auth: {
      user: process.env.SMTP_USER,        // teklif@tedarikci.org.tr
      pass: process.env.SMTP_PASS,        // ********
    },
  });
}

const FROM_NAME = process.env.SMTP_FROM_NAME || "Kurumsal Tedarikçi";
const FROM_ADDR = process.env.SMTP_USER;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ message: "Only POST" });
    const { teklifId, toEmail, pdfBase64 } = req.body || {};
    if (!teklifId || !toEmail || !pdfBase64) {
      return res.status(400).json({ message: "teklifId, toEmail, pdfBase64 gerekli" });
    }

    const teklifler = await getTeklifCollection();
    const teklif = await teklifler.findOne({ _id: new ObjectId(teklifId) });
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    const approveUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/teklif/onay/${teklif._id.toString()}?ok=1`;

    const mail = {
      from: `"${FROM_NAME}" <${FROM_ADDR}>`,
      to: toEmail,
      subject: `Teklif #${teklif.number} — ${teklif.cariAd}`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px">
          <p>Merhaba, ekli dosyada <b>#${teklif.number}</b> nolu teklifimizi bulabilirsiniz.</p>
          <p><b>Müşteri:</b> ${teklif.cariAd}</p>
          <p><b>Toplam:</b> ${Intl.NumberFormat("tr-TR", {minimumFractionDigits:2}).format(teklif?.totals?.genelToplam || 0)} TL</p>
          <p><a href="${approveUrl}" target="_blank" style="color:#0b79d0">Teklifi onaylamak için tıklayın</a></p>
          <hr/>
          <p>Kurumsal Tedarikçi<br/>www.tedarikci.org.tr • iletisim@tedarikci.org.tr</p>
        </div>
      `,
      attachments: [
        {
          filename: `Teklif-${teklif.number}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ],
    };

    const t = transporter();
    await t.sendMail(mail);

    // gönderildi olarak işaretle
    await teklifler.updateOne(
      { _id: teklif._id },
      { $set: { status: "Gönderildi", sentAt: new Date() } }
    );

    return res.status(200).json({ message: "E-posta gönderildi ve durum 'Gönderildi' yapıldı." });
  } catch (e) {
    console.error("mail error:", e);
    return res.status(500).json({ message: "E-posta gönderilemedi" });
  }
}
