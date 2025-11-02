// 📄 /lib/mailer.js
import nodemailer from "nodemailer";

export function createTransport() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP env eksik. Lütfen .env.local kontrol edin.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 465),
    secure: String(SMTP_SECURE ?? "true") === "true", // 465 için secure:true
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * PDF ekli e-posta gönder
 * @param {Object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} opts.pdfBase64 - "data:application/pdf;base64,..." veya ham base64
 * @param {string} [opts.cc]
 */
export async function sendMailWithPdf({ to, subject, html, pdfBase64, cc }) {
  const transport = createTransport();

  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const fromName  = process.env.SMTP_FROM_NAME || "Satış Takip";

  // Data URL geldiyse prefix'i sıyır
  let base64 = pdfBase64 || "";
  const comma = base64.indexOf(",");
  if (base64.startsWith("data:") && comma > -1) {
    base64 = base64.slice(comma + 1);
  }

  const message = {
    from: `"${fromName}" <${fromEmail}>`,
    to,
    cc,
    subject,
    html,
    attachments: [
      {
        filename: "teklif.pdf",
        content: Buffer.from(base64, "base64"),
        contentType: "application/pdf",
      },
    ],
  };

  return transport.sendMail(message);
}
