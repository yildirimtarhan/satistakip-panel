import dbConnect from "@/lib/mongodb";
import Teklif from "@/models/Teklif";
import { sendMailApiBrevo } from "@/lib/mail/sendMail";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

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

    // ✅ Linkler artık %100 doğru domain ile gider
    const onayLink = `${APP_URL}/teklif/onay/${teklifId}?ok=1`;
    const pdfLink = `${APP_URL}/api/teklif/view?id=${teklifId}`;

    const mailSubject = subject || `Teklif - ${teklif?.number || ""}`;

    const mailMessage =
      message ||
      "Merhaba,\nTeklifinizi aşağıdaki bağlantılardan inceleyebilirsiniz.";

    const htmlMessage = escapeHtml(mailMessage).replaceAll("\n", "<br/>");

    const firmaAdi = escapeHtml(process.env.SMTP_FROM_NAME || "Kurumsal Tedarikçi");

    // ✅ Profesyonel HTML tasarım + butonlar
    const html = `
      <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:30px 15px">
        <div style="max-width:650px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.08);overflow:hidden">

          <div style="background:#0d6efd;color:#fff;padding:18px 22px">
            <h2 style="margin:0;font-size:18px;font-weight:700">📌 Teklif Bilgilendirmesi</h2>
            <div style="margin-top:4px;font-size:13px;opacity:0.9">
              Teklif No: <b>${escapeHtml(teklif?.number || "-")}</b>
            </div>
          </div>

          <div style="padding:20px 22px;color:#111">
            <p style="margin-top:0;font-size:14px;line-height:1.7">${htmlMessage}</p>

            <div style="margin-top:18px;padding:14px;background:#f8fafc;border:1px solid #e7eef8;border-radius:10px">
              <div style="font-size:13px;color:#444;margin-bottom:10px">
                ✅ Teklifinizi görüntülemek / onaylamak için:
              </div>

              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <a href="${onayLink}" target="_blank"
                  style="background:#198754;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700;font-size:13px;display:inline-block">
                  ✅ Teklifi Onayla / Revize İste
                </a>

                <a href="${pdfLink}" target="_blank"
                  style="background:#0d6efd;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700;font-size:13px;display:inline-block">
                  📄 PDF Görüntüle
                </a>
              </div>

              <div style="margin-top:12px;font-size:12px;color:#666">
                Eğer butonlar açılmazsa:
                <br/>
                <a href="${onayLink}" target="_blank" style="color:#0d6efd">${onayLink}</a>
                <br/>
                <a href="${pdfLink}" target="_blank" style="color:#0d6efd">${pdfLink}</a>
              </div>
            </div>

            <hr style="border:none;border-top:1px solid #eee;margin:18px 0" />

            <p style="margin:0;font-size:12px;color:#777">
              Bu mail otomatik olarak gönderilmiştir • ${firmaAdi}
            </p>
          </div>

        </div>
      </div>
    `;

    const text = `${mailMessage}

✅ Onay Linki: ${onayLink}
📄 PDF Linki: ${pdfLink}

${process.env.SMTP_FROM_NAME || "Kurumsal Tedarikçi"}`;

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
