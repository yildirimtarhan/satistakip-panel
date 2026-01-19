// pages/api/teklif/mail.js
import connectMongo from "../../../lib/mongo";
import Teklif from "../../../models/Teklif";
import { verifyToken } from "../../../lib/auth";

// ✅ sende hangi helper varsa ona göre:
// - Eğer lib/sendMail.js kullanıyorsan:
import { sendMail } from "../../../lib/sendMail";
// - Eğer bazı yerlerde sendEmail kullanıldıysa (alias dosyası da var):
// import { sendEmail as sendMail } from "../../../lib/sendEmail";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    // dashboard çağrısı auth’lu kalsın
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    await connectMongo();

    const { teklifId, toEmail, mode } = req.body || {};
    if (!teklifId) return res.status(400).json({ message: "teklifId zorunlu" });
    if (!toEmail) return res.status(400).json({ message: "toEmail zorunlu" });

    const teklif = await Teklif.findById(teklifId).lean();
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    // ✅ Linkler artık asla localhost olmaz
    const onayLink = `${APP_URL}/teklif/onay/${teklifId}?ok=1`;
    const pdfLink = `${APP_URL}/api/teklif/view?id=${teklifId}`;

    const teklifNo = teklif?.number || "TEKLIF";
    const cariUnvan = teklif?.cariUnvan || teklif?.cariAdi || "Müşteri";

    // mode:
    // - "offer"  -> teklif gönderimi (default)
    // - "revize_alindi" -> müşteri revize isteyince "revize alındı" maili
    const isRevizeMail = mode === "revize_alindi";

    const subject = isRevizeMail
      ? `Revize talebiniz alındı - ${teklifNo}`
      : `Teklif - ${teklifNo}`;

    const preheader = isRevizeMail
      ? "Revize talebiniz başarıyla alındı. En kısa sürede güncelleyip tekrar ileteceğiz."
      : "Teklif detaylarını aşağıdaki bağlantılardan inceleyebilirsiniz.";

    const title = isRevizeMail ? "Revize Talebi Alındı" : "Teklifiniz Hazır";

    const mainText = isRevizeMail
      ? `Sayın ${cariUnvan}, revize talebiniz alınmıştır. Ekibimiz teklifi güncelleyip size tekrar iletecektir.`
      : `Sayın ${cariUnvan}, teklif detaylarını aşağıdaki bağlantılardan inceleyebilirsiniz.`;

    // ✅ Basit, şık, butonlu HTML
    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background:#f5f7fb; font-family:Arial, sans-serif;">
    <div style="max-width:680px; margin:0 auto; padding:24px;">
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
        ${preheader}
      </div>

      <div style="background:#ffffff; border-radius:14px; box-shadow:0 10px 30px rgba(16,24,40,0.08); overflow:hidden;">
        <div style="padding:22px 22px 10px 22px; border-bottom:1px solid #eef2f7;">
          <div style="font-size:18px; font-weight:700; color:#111827;">Kurumsal Tedarikçi</div>
          <div style="font-size:12px; color:#6b7280; margin-top:4px;">${title}</div>
        </div>

        <div style="padding:18px 22px; color:#111827; line-height:1.6;">
          <p style="margin:0 0 12px 0;">${mainText}</p>

          <div style="background:#f9fafb; border:1px solid #eef2f7; border-radius:12px; padding:14px; margin:14px 0;">
            <div style="font-size:13px; color:#374151; margin-bottom:10px;">
              <strong>Teklif No:</strong> ${teklifNo}
              ${teklif?.genelToplam ? `&nbsp;&nbsp;•&nbsp;&nbsp;<strong>Genel Toplam:</strong> ${teklif.genelToplam} ${teklif?.paraBirimi || "TL"}` : ""}
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <a href="${onayLink}" style="background:#16a34a; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px; display:inline-block; font-weight:700;">
                Online Onay / Revize
              </a>
              <a href="${pdfLink}" style="background:#111827; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px; display:inline-block; font-weight:700;">
                PDF Görüntüle
              </a>
            </div>
          </div>

          <p style="margin:0; font-size:13px; color:#6b7280;">
            Bu e-posta otomatik gönderilmiştir.
          </p>
        </div>

        <div style="padding:14px 22px; background:#0b1220; color:#cbd5e1; font-size:12px;">
          © ${new Date().getFullYear()} Kurumsal Tedarikçi
        </div>
      </div>
    </div>
  </body>
</html>
    `.trim();

    await sendMail({
      to: toEmail,
      subject,
      html,
      // from / sender ayarların lib/sendMail içinde yönetiliyorsa burada gerek yok
    });

    return res.status(200).json({
      ok: true,
      message: "Mail gönderildi",
      links: { onayLink, pdfLink },
    });
  } catch (err) {
    console.error("mail.js error:", err);
    return res.status(500).json({ message: "Mail gönderilemedi", error: String(err?.message || err) });
  }
}
