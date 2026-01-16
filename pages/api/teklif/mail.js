import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dbConnect from "../../../lib/dbConnect";
import Teklif from "../../../models/Teklif";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token yok" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { teklifId, toEmail } = req.body;

    if (!teklifId) return res.status(400).json({ message: "teklifId gerekli" });

    const teklif = await Teklif.findOne({ _id: teklifId, userId: decoded.userId });
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    if (!teklif.pdfUrl) {
      return res.status(400).json({ message: "Önce Sunucuya Kaydet yapmalısın (pdfUrl yok)" });
    }

    const recipient = toEmail || process.env.NOTIFY_EMAIL;
    if (!recipient) return res.status(400).json({ message: "Alıcı mail bulunamadı" });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE) === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const subject = `Teklif: ${teklif.number || teklif._id}`;
    const html = `
      <h3>Teklif Gönderildi</h3>
      <p><b>Teklif No:</b> ${teklif.number || "-"}</p>
      <p><b>Cari:</b> ${teklif.cariUnvan || "-"}</p>
      <p><b>Genel Toplam:</b> ${teklif.genelToplam || 0} ${teklif.paraBirimi || ""}</p>
      <hr/>
      <p>PDF Linki:</p>
      <a href="${teklif.pdfUrl}" target="_blank">${teklif.pdfUrl}</a>
    `;

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "Teklif Sistemi"}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: recipient,
      subject,
      html,
    });

    teklif.status = "gonderildi";
    await teklif.save();

    return res.status(200).json({
      message: "Mail gönderildi",
      teklifId: teklif._id,
      pdfUrl: teklif.pdfUrl,
      teklif,
    });
  } catch (err) {
    console.error("❌ /api/teklif/mail hata:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
