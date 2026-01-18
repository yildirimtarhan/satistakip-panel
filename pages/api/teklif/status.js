import dbConnect from "../../../lib/mongodb";
import Teklif from "../../../models/Teklif";
import nodemailer from "nodemailer";

function makeTransporter() {
  const secure = String(process.env.SMTP_SECURE) === "true"; // Zoho 465 -> true
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587));

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function mailFrom() {
  const name = process.env.SMTP_FROM_NAME || "Kurumsal Tedarikçi";
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  return `"${name}" <${email}>`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ message: "Only POST" });

    await dbConnect();

    const { teklifId, action, note } = req.body || {};
    if (!teklifId || !action) {
      return res.status(400).json({ message: "teklifId ve action gerekli" });
    }

    const teklif = await Teklif.findById(teklifId);
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    // ✅ action -> status
    if (action === "approve") {
      teklif.status = "onaylandi";
      teklif.approvedAt = new Date();
      teklif.revisionNote = "";
    } else if (action === "revise") {
      teklif.status = "revize_istendi";
      teklif.revisionRequestedAt = new Date();
      teklif.revisionNote = String(note || "Revize talep edildi.").trim();
    } else {
      return res.status(400).json({ message: "Geçersiz action (approve|revise)" });
    }

    await teklif.save();

    // ✅ Multi-tenant notify hedefi:
    // 1) teklif.companyEmail (firma bazlı)
    // 2) env NOTIFY_EMAIL (fallback)
    // 3) smtp user (son çare)
    const notifyEmail =
      (teklif.companyEmail || "").trim() ||
      (process.env.NOTIFY_EMAIL || "").trim() ||
      process.env.SMTP_USER;

    const transporter = makeTransporter();

    const teklifNo = teklif.number || teklif._id;
    const cari = teklif.cariName || "-";
    const toplam = `${teklif.genelToplam || 0} ${teklif.paraBirimi || ""}`;

    // ✅ PDF satırı
    const pdfLine = teklif.pdfUrl
      ? `<p><b>PDF:</b> <a href="${teklif.pdfUrl}" target="_blank">Görüntüle</a></p>`
      : `<p><b>PDF:</b> (Yok)</p>`;

    // ✅ (1) İç ekibe bildirim maili (senin mevcut sistemin)
    if (notifyEmail) {
      if (action === "approve") {
        await transporter.sendMail({
          from: mailFrom(),
          to: notifyEmail,
          subject: `✅ Teklif Onaylandı - ${teklifNo}`,
          html: `
            <div style="font-family:Arial,sans-serif">
              <h2 style="color:#16a34a;margin:0 0 8px">✅ Teklif ONAYLANDI</h2>
              <p><b>Teklif No:</b> ${teklifNo}</p>
              <p><b>Cari:</b> ${cari}</p>
              <p><b>Toplam:</b> ${toplam}</p>
              ${pdfLine}
              <hr />
              <p style="color:#6b7280;font-size:12px">SatışTakip ERP - Otomatik bildirim</p>
            </div>
          `,
        });
      }

      if (action === "revise") {
        await transporter.sendMail({
          from: mailFrom(),
          to: notifyEmail,
          subject: `✍️ Revize İstendi - ${teklifNo}`,
          html: `
            <div style="font-family:Arial,sans-serif">
              <h2 style="color:#f59e0b;margin:0 0 8px">✍️ Teklif için REVİZE istendi</h2>
              <p><b>Teklif No:</b> ${teklifNo}</p>
              <p><b>Cari:</b> ${cari}</p>
              <p><b>Toplam:</b> ${toplam}</p>
              <p><b>Revize Notu:</b> ${teklif.revisionNote || "-"}</p>
              ${pdfLine}
              <hr />
              <p style="color:#6b7280;font-size:12px">SatışTakip ERP - Otomatik bildirim</p>
            </div>
          `,
        });
      }
    }

    // ✅ (2) MÜŞTERİYE "REVİZE ALINDI" MAİLİ (Yeni eklenen kısım)
    if (action === "revise") {
      // Cari maili hangi alanda tutuluyorsa burayı yakalıyoruz:
      const customerEmail =
        (teklif.cariEmail || "").trim() ||
        (teklif.customerEmail || "").trim() ||
        (teklif.email || "").trim();

      if (customerEmail) {
        const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
        const onayLink = `${appUrl}/teklif/onay/${teklif._id}?ok=1`;
        const pdfLink = teklif.pdfUrl || `${appUrl}/api/teklif/view?id=${teklif._id}`;

        await transporter.sendMail({
          from: mailFrom(),
          to: customerEmail,
          subject: `✅ Revize talebiniz alındı - ${teklifNo}`,
          html: `
            <div style="font-family:Arial,sans-serif">
              <h2 style="color:#16a34a;margin:0 0 8px">✅ Revize talebiniz alındı</h2>

              <p>Merhaba,</p>
              <p>
                <b>${teklifNo}</b> numaralı teklif için revize talebiniz tarafımıza ulaştı.
                En kısa sürede güncelleme yapıp size tekrar ileteceğiz.
              </p>

              <p><b>Revize Notunuz:</b> ${teklif.revisionNote || "-"}</p>

              <p style="margin-top:12px">
                <b>📄 Teklif PDF:</b><br/>
                <a href="${pdfLink}" target="_blank">${pdfLink}</a>
              </p>

              <p style="margin-top:12px">
                <b>🔗 Teklif Sayfası:</b><br/>
                <a href="${onayLink}" target="_blank">${onayLink}</a>
              </p>

              <hr />
              <p style="color:#6b7280;font-size:12px">
                Kurumsal Tedarikçi • Otomatik bilgilendirme
              </p>
            </div>
          `,
        });
      }
    }

    return res.status(200).json({ message: "✅ Durum güncellendi", teklif });
  } catch (err) {
    console.error("❌ /api/teklif/status error:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
