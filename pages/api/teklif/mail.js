import dbConnect from "../../../lib/dbConnect";
import Teklif from "../../../models/Teklif";
import Cari from "../../../models/Cari";
import { sendMailApiBrevo } from "@/lib/mail/sendMail";


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const { teklifId, toEmail } = req.body;

    if (!teklifId) {
      return res.status(400).json({ message: "teklifId zorunludur" });
    }

    if (!toEmail) {
      return res.status(400).json({ message: "toEmail zorunludur" });
    }

    const teklif = await Teklif.findById(teklifId);
    if (!teklif) {
      return res.status(404).json({ message: "Teklif bulunamadı" });
    }

    // Cari bilgisi varsa çekelim (müşteri adı için)
    let cari = null;
    if (teklif.cariId) {
      cari = await Cari.findById(teklif.cariId);
    }

    // ✅ APP_URL (Render / Prod / Local uyumlu)
    const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(
      /\/+$/,
      ""
    );

    // ✅ Linkler (3 tane)
    const onayLink = `${APP_URL}/teklif/onay/${teklifId}?ok=1`;
    const revizeLink = `${APP_URL}/teklif/onay/${teklifId}?revize=1`;
    const pdfLink = `${APP_URL}/api/teklif/view?id=${teklifId}`;

    // ✅ Mail içeriği (profesyonel butonlu)
    const cariAdi =
      cari?.unvan ||
      cari?.ad ||
      cari?.isim ||
      teklif?.cariUnvan ||
      "Sayın Yetkili";

    const teklifNo = teklif?.number || "Teklif";
    const toplam = teklif?.genelToplam ?? teklif?.genelToplamTL ?? "";

    const subject = `Teklif - ${teklifNo}`;

    const html = `
      <div style="background:#f5f7fb; padding:30px 10px; font-family:Arial, sans-serif;">
        <div style="max-width:650px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 20px rgba(0,0,0,0.08);">

          <div style="padding:22px 24px; background:linear-gradient(90deg,#2563eb,#1d4ed8); color:#fff;">
            <div style="font-size:18px; font-weight:700;">Kurumsal Tedarikçi</div>
            <div style="font-size:13px; opacity:0.9; margin-top:4px;">
              Teklif onay / revize işlemleri için mail
            </div>
          </div>

          <div style="padding:24px;">
            <div style="font-size:15px; color:#111827; margin-bottom:10px;">
              Merhaba <b>${cariAdi}</b>,
            </div>

            <div style="font-size:14px; color:#374151; line-height:1.6;">
              <b>${teklifNo}</b> numaralı teklifiniz hazırlanmıştır.
              ${toplam !== "" ? `<br/><b>Genel Toplam:</b> ${toplam} TL` : ""}
              <br/><br/>
              Aşağıdaki butonlardan teklifinizi inceleyebilir, onaylayabilir veya revize isteyebilirsiniz.
            </div>

            <div style="margin-top:18px; display:flex; gap:10px; flex-wrap:wrap;">
              <a href="${onayLink}"
                 style="display:inline-block; padding:12px 18px; background:#16a34a; color:white; text-decoration:none; border-radius:10px; font-weight:700;">
                 ✅ Onayla
              </a>

              <a href="${revizeLink}"
                 style="display:inline-block; padding:12px 18px; background:#f59e0b; color:white; text-decoration:none; border-radius:10px; font-weight:700;">
                 ✍️ Revize İste
              </a>

              <a href="${pdfLink}"
                 style="display:inline-block; padding:12px 18px; background:#2563eb; color:white; text-decoration:none; border-radius:10px; font-weight:700;">
                 📄 PDF Görüntüle
              </a>
            </div>

            <div style="margin-top:18px; font-size:13px; color:#6b7280; line-height:1.5;">
              Eğer butonlar çalışmazsa aşağıdaki linkleri tarayıcıya yapıştırabilirsiniz:
              <br/>
              <div style="margin-top:8px;">
                ✅ Onay: <a href="${onayLink}">${onayLink}</a><br/>
                ✍️ Revize: <a href="${revizeLink}">${revizeLink}</a><br/>
                📄 PDF: <a href="${pdfLink}">${pdfLink}</a>
              </div>
            </div>

            <hr style="margin:22px 0; border:none; border-top:1px solid #e5e7eb;" />

            <div style="font-size:12px; color:#9ca3af;">
              Otomatik gönderimdir • Kurumsal Tedarikçi
            </div>
          </div>
        </div>
      </div>
    `;

    // ✅ Gönderim
    await sendEmail({
      to: toEmail,
      subject,
      html,
    });

    return res.status(200).json({
      message: "Mail gönderildi",
      onayLink,
      revizeLink,
      pdfLink,
    });
  } catch (error) {
    console.error("mail.js error:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error?.message || "Bilinmeyen hata",
    });
  }
}
