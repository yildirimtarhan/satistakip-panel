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
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST" });
  }

  try {
    await dbConnect();

    const { teklifId, toEmail, subject, message } = req.body || {};

    if (!teklifId || !toEmail) {
      return res.status(400).json({ message: "teklifId ve toEmail gerekli" });
    }

    const teklif = await Teklif.findById(teklifId).lean();
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    if (!teklif.pdfUrl) {
      return res.status(400).json({
        message: "Bu teklife ait PDF bulunamadı. Önce Sunucuya Kaydet.",
      });
    }

    // ✅ ENV
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return res.status(500).json({
        message: "SMTP env eksik (SMTP_HOST/SMTP_USER/SMTP_PASS)",
      });
    }

    // ✅ 465 ise secure true, 587 ise false (STARTTLS)
    const secure = SMTP_PORT === 465;

    console.log("📧 SMTP CONFIG:", {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure,
      user: SMTP_USER,
    });

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },

      // ✅ TIMEOUT FIX (Render’da ETIMEDOUT için)
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,

      // ✅ 587 için TLS
      tls: {
        rejectUnauthorized: false,
      },
    });

    // ✅ SMTP Test (hata burada yakalanır)
    try {
      await transporter.verify();
      console.log("✅ SMTP verify OK");
    } catch (err) {
      console.error("❌ SMTP verify FAIL:", err);
      return res.status(500).json({
        message: "SMTP bağlantı hatası (verify fail)",
        error: err?.message || String(err),
      });
    }

    const mailSubject = subject || `Teklif - ${teklif?.number || ""}`;
    const mailMessage =
      message || "Merhaba,\nTeklifinizi aşağıdaki linkten görüntüleyebilirsiniz.";

    const htmlMessage = escapeHtml(mailMessage).replaceAll("\n", "<br/>");

    await transporter.sendMail({
      from: `"Kurumsal Tedarikçi" <${SMTP_USER}>`,
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

    // ✅ status güncelle
    await Teklif.findByIdAndUpdate(teklifId, {
      $set: { status: "Gönderildi", sentAt: new Date() },
    });

    return res.status(200).json({ message: "✅ Mail gönderildi" });
  } catch (e) {
    console.error("MAIL ERROR:", e);
    return res.status(500).json({
      message: "Mail gönderilemedi",
      error: e?.message || String(e),
    });
  }
}
