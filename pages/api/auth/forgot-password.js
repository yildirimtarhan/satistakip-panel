// pages/api/auth/forgot-password.js

import nodemailer from "nodemailer";
import { sendPasswordResetEmail } from "@/lib/emailNotifications";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST istekleri desteklenir" });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "E-posta adresi gerekli" });
  }

  const resetLink = `${BASE_URL}/auth/reset-password?email=${encodeURIComponent(email)}`;

  // 1) Önce Brevo ile dene
  const brevoResult = await sendPasswordResetEmail(email, resetLink);
  if (brevoResult && brevoResult.ok === true) {
    return res.status(200).json({ message: "Şifre sıfırlama bağlantısı e-posta ile gönderildi." });
  }
  if (brevoResult && brevoResult.ok === false && brevoResult.error) {
    console.error("Brevo şifre sıfırlama hatası:", brevoResult.error);
    return res.status(500).json({
      message: "E-posta gönderilemedi.",
      detail: brevoResult.error,
    });
  }

  // 2) Brevo yoksa veya env eksikse SMTP (Zoho vb.) ile dene
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return res.status(500).json({
      message: "E-posta gönderilemedi.",
      detail: "BREVO_API_KEY ve SMTP_FROM_EMAIL (.env) tanımlı olmalı veya SMTP_HOST/SMTP_USER ile Zoho ayarlanmalı. Detay: docs/MAIL-ENV-KONTROL.md",
    });
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Şifre Sıfırlama Bağlantısı",
      html: `
        <p>Merhaba,</p>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Eğer bu işlemi siz başlatmadıysanız bu e-postayı dikkate almayın.</p>
      `,
    });
    return res.status(200).json({ message: "Şifre sıfırlama bağlantısı e-posta ile gönderildi." });
  } catch (error) {
    console.error("SMTP e-posta gönderim hatası:", error);
    return res.status(500).json({
      message: "E-posta gönderilemedi.",
      detail: error.message || String(error),
    });
  }
}
