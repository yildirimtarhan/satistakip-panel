import nodemailer from "nodemailer";

export async function sendMail({ to, subject, html }) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.zoho.eu",
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465, // ✅ Zoho 465 SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fromName = process.env.SMTP_FROM_NAME || "Kurumsal Tedarikçi";
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    });

    console.log("✅ MAIL SENT:", {
      to,
      subject,
      messageId: info.messageId,
    });

    return true;
  } catch (err) {
    console.error("❌ MAIL SEND ERROR:", err.message);
    throw err;
  }
}
