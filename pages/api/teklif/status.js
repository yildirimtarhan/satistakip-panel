import dbConnect from "../../../lib/mongodb";
import Teklif from "../../../models/Teklif";
import nodemailer from "nodemailer";

function makeTransporter() {
  const secure = String(process.env.SMTP_SECURE) === "true";
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

function safeAppUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export default async function handler(req, res) {
  try {
    // ✅ CORS / Preflight desteği (public sayfalarda bazen lazım oluyor)
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ message: "Only POST" });
    }

    await dbConnect();

    const { teklifId, action, note } = req.body || {};

    if (!teklifId || !action) {
      return res.status(400).json({ message: "teklifId ve action gerekli" });
    }

    const teklif = await Teklif.findById(teklifId);
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    // ✅ Status güncelle (ASLA buradan sonra mail yüzünden fail ettirmiyoruz)
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

    // ✅ HIZLI DÖN: Önce client’a 200 dönelim (takılma biter)
    // Sonra mail işleri devam etsin diye setImmediate ile async çalıştıracağız.
    res.status(200).json({ message: "✅ Durum güncellendi", teklif });

    // ✅ Mail işleri arka planda
    setImmediate(async () => {
      try {
        const transporter = makeTransporter();

        const teklifNo = teklif.number || teklif._id;
        const cari = teklif.cariName || "-";
        const toplam = `${teklif.genelToplam || 0} ${teklif.paraBirimi || ""}`;

        const appUrl = safeAppUrl();
        const onayLink = `${appUrl}/teklif/onay/${teklif._id}?ok=1`;
        const pdfLink = teklif.pdfUrl || `${appUrl}/api/teklif/view?id=${teklif._id}`;

        const pdfLine = `
          <p style="margin:10px 0">
            <b>📄 PDF:</b>
            <a href="${pdfLink}" target="_blank">${pdfLink}</a>
          </p>
        `;

        // ✅ İç ekibe bildirim hedefi
        const notifyEmail =
          (teklif.companyEmail || "").trim() ||
          (process.env.NOTIFY_EMAIL || "").trim() ||
          process.env.SMTP_USER;

        if (notifyEmail) {
          if (action === "approve") {
            await transporter.sendMail({
              from: mailFrom(),
              to: notifyEmail,
              subject: `✅ Teklif Onaylandı - ${teklifNo}`,
              html: `
                <div style="font-family:Arial,sans-serif;padding:10px">
                  <h2 style="color:#16a34a;margin:0 0 8px">✅ Teklif ONAYLANDI</h2>
                  <p><b>Teklif No:</b> ${teklifNo}</p>
                  <p><b>Cari:</b> ${cari}</p>
                  <p><b>Toplam:</b> ${toplam}</p>
                  ${pdfLine}
                  <p style="margin:10px 0">
                    <b>🔗 Onay Sayfası:</b>
                    <a href="${onayLink}" target="_blank">${onayLink}</a>
                  </p>
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
                <div style="font-family:Arial,sans-serif;padding:10px">
                  <h2 style="color:#f59e0b;margin:0 0 8px">✍️ Teklif için REVİZE istendi</h2>
                  <p><b>Teklif No:</b> ${teklifNo}</p>
                  <p><b>Cari:</b> ${cari}</p>
                  <p><b>Toplam:</b> ${toplam}</p>
                  <p><b>Revize Notu:</b> ${teklif.revisionNote || "-"}</p>
                  ${pdfLine}
                  <p style="margin:10px 0">
                    <b>🔗 Onay Sayfası:</b>
                    <a href="${onayLink}" target="_blank">${onayLink}</a>
                  </p>
                  <hr />
                  <p style="color:#6b7280;font-size:12px">SatışTakip ERP - Otomatik bildirim</p>
                </div>
              `,
            });
          }
        }

        // ✅ Müşteriye "Revize alındı" maili
        if (action === "revise") {
          const customerEmail =
            (teklif.cariEmail || "").trim() ||
            (teklif.customerEmail || "").trim() ||
            (teklif.email || "").trim();

          if (customerEmail) {
            await transporter.sendMail({
              from: mailFrom(),
              to: customerEmail,
              subject: `✅ Revize talebiniz alındı - ${teklifNo}`,
              html: `
                <div style="font-family:Arial,sans-serif;padding:10px">
                  <h2 style="color:#16a34a;margin:0 0 8px">✅ Revize talebiniz alındı</h2>
                  <p>Merhaba,</p>
                  <p>
                    <b>${teklifNo}</b> numaralı teklif için revize talebiniz bize ulaştı.
                    En kısa sürede güncelleyip size tekrar ileteceğiz.
                  </p>

                  <p><b>Revize Notunuz:</b> ${teklif.revisionNote || "-"}</p>

                  ${pdfLine}

                  <p style="margin:10px 0">
                    <b>🔗 Teklif Sayfanız:</b>
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
      } catch (mailErr) {
        console.error("❌ status.js background mail error:", mailErr);
      }
    });

    // ✅ ÖNEMLİ: burada return YOK çünkü zaten 200 döndük
  } catch (err) {
    console.error("❌ /api/teklif/status error:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
