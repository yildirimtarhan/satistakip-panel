// 📄 /pages/api/teklif/send.js
import { sendMailWithPdf } from "@/lib/mailer";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // (Opsiyonel) Yetkilendirme — projende JWT kullanıyorsun
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Yetkisiz" });

    jwt.verify(token, process.env.JWT_SECRET);

    const { to, cc, subject, html, pdfBase64 } = req.body || {};
    if (!to || !subject || !html || !pdfBase64) {
      return res.status(400).json({ message: "Eksik alanlar (to, subject, html, pdfBase64) zorunlu." });
    }

    await sendMailWithPdf({ to, cc, subject, html, pdfBase64 });
    return res.status(200).json({ ok: true, message: "E-posta gönderildi ✅" });
  } catch (err) {
    console.error("📧 Mail gönderim hatası:", err);
    return res.status(500).json({ message: "Mail gönderilemedi", error: err?.message });
  }
}
