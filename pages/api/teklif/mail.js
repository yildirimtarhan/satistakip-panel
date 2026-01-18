import dbConnect from "@/lib/mongodb";
import Teklif from "@/models/Teklif";
import { sendMailApiBrevo } from "@/lib/mail/sendMail";

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ensureAbsoluteUrl(url = "", baseUrl = "") {
  if (!url) return "";
  const trimmed = String(url).trim();

  // zaten absolute ise olduğu gibi döndür
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // relative ise baseUrl ile birleştir
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return base ? `${base}${path}` : trimmed;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Only POST" });
  }

  try {
    await dbConnect();

    const { teklifId, toEmail, subject, message } = req.body || {};

    if (!teklifId || !toEmail) {
      return res.status(400).json({
        ok: false,
        message: "teklifId ve toEmail gerekli",
      });
    }

    const teklif = await Teklif.findById(teklifId).lean();
    if (!teklif) {
      return res.status(404).json({ ok: false, message: "Teklif bulunamadı" });
    }

    if (!teklif.pdfUrl) {
      return res.status(400).json({
        ok: false,
        message: "Bu teklife ait PDF bulunamadı. Önce Sunucuya Kaydet.",
      });
    }

    // ✅ BASE_URL (Render'da ayarlanacak)
    // Örn: https://www.satistakip.online
    const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(
      /\/+$/,
      ""
    );

    // ✅ pdfUrl absolute yap (localhost/relative hatasını çözer)
    const pdfUrl = ensureAbsoluteUrl(teklif.pdfUrl, baseUrl);

    const mailSubject = subject || `Teklif - ${teklif?.number || ""}`;

    const mailMessage =
      message || "Merhaba,\nTeklifinizi aşağıdaki linkten görüntüleyebilirsiniz.";

    const htmlMessage = escapeHtml(mailMessage).replaceAll("\n", "<br/>");

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">
        <p>${htmlMessage}</p>

        <p style="margin-top:12px">
          <b>📄 Teklif PDF Linki:</b><br/>
          <a href="${pdfUrl}" target="_blank">${pdfUrl}</a>
        </p>

        <hr/>
        <p style="color:#666;font-size:12px">
          Otomatik gönderim • ${escapeHtml(
            process.env.SMTP_FROM_NAME || "Kurumsal Tedarikçi"
          )}
        </p>
      </div>
    `;

    const text = `${mailMessage}\n\nTeklif PDF Linki: ${pdfUrl}`;

    const result = await sendMailApiBrevo({
      to: toEmail,
      subject: mailSubject,
      html,
      text,
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        message: "Brevo API ile mail gönderilemedi",
        ...result,
      });
    }

    await Teklif.findByIdAndUpdate(teklifId, {
      $set: { status: "Gönderildi", sentAt: new Date() },
    });

    return res.status(200).json({
      ok: true,
      message: "✅ Mail gönderildi (Brevo API)",
      messageId: result.messageId,
    });
  } catch (err) {
    console.error("MAIL API ERROR:", err?.message || err);
    return res.status(500).json({
      ok: false,
      message: "Mail gönderilemedi",
      error: err?.message || String(err),
    });
  }
}
