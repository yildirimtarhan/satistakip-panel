import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  const { to, subject, html, attachments = [] } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ message: "Eksik bilgi" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // smtp.zoho.eu / smtp.gmail.com
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments: attachments.map((f) => ({
        filename: f.filename,
        content: f.content, // base64
        encoding: "base64",
      })),
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "Mail gönderildi ✅" });
  } catch (err) {
    console.error("Mail error:", err);
    return res.status(500).json({ message: "Mail gönderilemedi ❌", error: err.message });
  }
}
