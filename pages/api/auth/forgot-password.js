// pages/api/auth/forgot-password.js

import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST istekleri desteklenir" });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "E-posta adresi gerekli" });
  }

  try {
    // SMTP bağlantısını oluştur
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Şifre sıfırlama linki (şimdilik dummy)
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/auth/reset-password?email=${encodeURIComponent(email)}`;

    // Mail gönder
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Şifre Sıfırlama Bağlantısı",
      html: `
        <p>Merhaba,</p>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
        <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
        <p>Eğer bu işlemi siz başlatmadıysanız bu e-postayı dikkate almayın.</p>
      `,
    });

    return res.status(200).json({ message: "Şifre sıfırlama bağlantısı gönderildi ✅" });
  } catch (error) {
    console.error("E-posta gönderim hatası:", error);
    return res.status(500).json({ message: "E-posta gönderilemedi", error: error.message });
  }
}
