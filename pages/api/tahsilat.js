import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";

import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import { connectToDatabase } from "@/lib/mongodb";

import { sendMail } from "@/lib/mail/sendMail";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ✅ TOKEN
    const token =
      req.headers.authorization?.split(" ")[1] ||
      req.query.token ||
      req.body.token ||
      "";

    if (!token) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    let decoded = null;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Token geçersiz" });
    }

    const userId = decoded?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    // 📥 BODY
    const {
      accountId,
      amount,
      currency,
      fxRate,
      amountFCY,
      note,
      date,
      type: bodyType,
      direction,
    } = req.body;

    // ✅ type yoksa direction'dan türet
    const type =
      bodyType ||
      (direction === "alacak"
        ? "tahsilat"
        : direction === "borc"
        ? "odeme"
        : "");

    const paymentMethod = req.body.paymentMethod || req.body.method || "cash";

    if (!accountId || !type || !amount) {
      return res.status(400).json({ message: "Zorunlu alanlar eksik" });
    }

    const trxDate = date ? new Date(date) : new Date();

    // ✅ Cari bul (ESKİ GİBİ - sadece userId ile)
    const cari = await Cari.findOne({ _id: accountId, userId });
    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    // ✅ DÜZELTİLDİ: Tahsilat = alacak, Ödeme = borc
    // Eğer frontend "alacak" gönderiyorsa tahsilat, "borc" gönderiyorsa ödeme
    const trxDirection = direction === "alacak" ? "alacak" : "borc";

    // ✅ Döviz hesapları
    const cur = currency || "TRY";
    const fx = cur === "TRY" ? 1 : Number(fxRate || 0);
    const fcy = cur === "TRY" ? Number(amount || 0) : Number(amountFCY || 0);
    const totalTRY = cur === "TRY" ? Number(amount || 0) : Number(fcy) * Number(fx || 0);

    // ✅ Transaction oluştur (ESKİ GİBİ - companyId yok)
    const trx = await Transaction.create({
      userId,
      accountId,
      type,                    // "tahsilat" veya "odeme"
      direction: trxDirection, // "alacak" veya "borc"
      amount: Number(Number(totalTRY).toFixed(2)),
      totalTRY: Number(Number(totalTRY).toFixed(2)),
      currency: cur,
      fxRate: Number(fx || 1),
      totalFCY: Number(Number(fcy).toFixed(2)),
      paymentMethod,
      note: note || "",
      date: trxDate,
      status: "active",
      isDeleted: false,
    });

     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ✅ BAKİYE GÜNCELLEME - BURAYA YAPIŞTIR (Satır ~115-125)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // Tahsilat (alacak): Cari bize borçlu, bakiye azalır (-)
    // Ödeme (borc): Biz cariye borçlu, bakiye artar (+)
    
    if (trxDirection === "alacak") {
      // Tahsilat aldık, carinin borcu azalır
      cari.bakiye = Number(cari.bakiye || 0) - Number(totalTRY);
    } else {
      // Ödeme yaptık, cariye borçlandık
      cari.bakiye = Number(cari.bakiye || 0) + Number(totalTRY);
    }

    await cari.save();

    

    // ✅ MAİL (GERÇEK ZOHO) + BAKİYE + PDF LİNK
    try {
      let companyEmail = "";
      try {
        const { db } = await connectToDatabase();
        const col = db.collection("company_settings");
        const company = await col.findOne({ userId });
        companyEmail = company?.eposta || "";
      } catch (e) {
        console.log("⚠️ company_settings okunamadı:", e.message);
      }

      if (companyEmail) {
        const cariName =
          cari?.unvan || cari?.firmaAdi || cari?.ad || cari?.name || "-";

        const isTahsilat = type === "tahsilat";

        const fmtMoney = (n) =>
          Number(n || 0).toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

        const pdfUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/tahsilat/pdf?id=${trx._id}&token=${token}`;

        const fxInfo =
          cur !== "TRY"
            ? `<tr>
                 <td style="padding:6px;border-bottom:1px solid #eee"><b>Döviz</b></td>
                 <td style="padding:6px;border-bottom:1px solid #eee">${fmtMoney(fcy)} ${cur} (Kur: ${Number(fx || 0).toFixed(4)})</td>
               </tr>`
            : "";

        await sendMail({
          to: companyEmail,
          subject: `✅ ${isTahsilat ? "Tahsilat" : "Ödeme"} Kaydedildi - ${cariName}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto">
              <h2 style="margin-bottom:5px;">
                ${isTahsilat ? "Tahsilat" : "Ödeme"} Kaydı Oluşturuldu
              </h2>
              <p style="color:#666;margin-top:0;">SatışTakip ERP Bildirimi</p>

              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:6px;border-bottom:1px solid #eee"><b>Cari</b></td>
                  <td style="padding:6px;border-bottom:1px solid #eee">${cariName}</td>
                </tr>

                <tr>
                  <td style="padding:6px;border-bottom:1px solid #eee"><b>Tür</b></td>
                  <td style="padding:6px;border-bottom:1px solid #eee">${isTahsilat ? "Tahsilat" : "Ödeme"}</td>
                </tr>

                ${fxInfo}

                <tr>
                  <td style="padding:6px;border-bottom:1px solid #eee"><b>Tutar</b></td>
                  <td style="padding:6px;border-bottom:1px solid #eee">${fmtMoney(totalTRY)} TRY</td>
                </tr>

                <tr>
                  <td style="padding:6px;border-bottom:1px solid #eee"><b>Ödeme Yöntemi</b></td>
                  <td style="padding:6px;border-bottom:1px solid #eee">${paymentMethod}</td>
                </tr>

                <tr>
                  <td style="padding:6px;border-bottom:1px solid #eee"><b>Tarih</b></td>
                  <td style="padding:6px;border-bottom:1px solid #eee">${trxDate.toLocaleDateString("tr-TR")}</td>
                </tr>

                <tr>
                  <td style="padding:6px;border-bottom:1px solid #eee"><b>Not</b></td>
                  <td style="padding:6px;border-bottom:1px solid #eee">${note || "-"}</td>
                </tr>

                <tr>
                  <td style="padding:6px;border-bottom:1px solid #eee"><b>Güncel Bakiye</b></td>
                  <td style="padding:6px;border-bottom:1px solid #eee"><b>${fmtMoney(cari.bakiye)} TRY</b></td>
                </tr>
              </table>

              <div style="margin-top:16px;">
                <a href="${pdfUrl}"
                  style="display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
                  Makbuz PDF Aç
                </a>
              </div>

              <p style="color:#888;margin-top:18px;font-size:12px">
                Bu e-posta otomatik gönderilmiştir.
              </p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.log("⚠️ Mail gönderilemedi:", mailErr.message);
    }

    // ✅ Response
   return res.status(200).json({
      message: "Başarılı",
      trx,
      newBalance: cari.bakiye,
    });
  } catch (err) {
    console.error("TAHSILAT API ERROR:", err);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}