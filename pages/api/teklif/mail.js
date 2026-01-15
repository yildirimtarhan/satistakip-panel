import nodemailer from "nodemailer";
import dbConnect from "@/lib/mongodb";
import Teklif from "@/models/Teklif";

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Only POST" });
    }

    await dbConnect();

    const { teklifId, toEmail, subject, message } = req.body || {};

    if (!teklifId || !toEmail) {
      return res.status(400).json({ message: "teklifId ve toEmail gerekli" });
    }

    const teklif = await Teklif.findById(teklifId).lean();
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    if (!teklif.pdfUrl) {
      return res
        .status(400)
        .json({ message: "Bu teklife ait PDF bulunamadı. Önce Sunucuya Kaydet." });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailSubject =
      subject ||
      `Teklif - ${teklif?.cariUnvan || teklif?.cariAdi || ""}`;

    const mailMessage = message || "Merhaba,\nTeklifinizi aşağıdan görüntüleyebilirsiniz.";

    const htmlMessage = escapeHtml(mailMessage).replaceAll("\n", "<br/>");

    await transporter.sendMail({
      from: `"Kurumsal Tedarikçi" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: mailSubject,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">
          <p>${htmlMessage}</p>

          <p style="margin-top:12px">
            <b>📄 Teklif PDF Linki:</b><br/>
            <a href="${teklif.pdfUrl}" target="_blank">${teklif.pdfUrl}</a>
          </p>

          <hr/>
          <p style="color:#666;font-size:12px">
            Kurumsal Tedarikçi • Otomatik gönderim
          </p>
        </div>
      `,
    });

    await Teklif.findByIdAndUpdate(teklifId, {
  $set: { status: "Gönderildi", sentAt: new Date() },
});


    return res.status(200).json({ message: "✅ Mail gönderildi" });
  } catch (e) {
    console.error("MAIL ERROR:", e);
    return res.status(500).json({ message: "Mail gönderilemedi", error: e.message });
  }
}
