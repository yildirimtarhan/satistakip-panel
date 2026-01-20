import dbConnect from "@/lib/mongodb";
import Teklif from "@/models/Teklif";
import { createPdf, drawLogo } from "@/lib/pdf/PdfEngine";


const money = (n) => {
  const num = Number(n || 0);
  return num.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "id gerekli" });

    // ✅ teklif
    const teklif = await Teklif.findById(id).lean();
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

   const { db } = await connectToDatabase();

let company = null;
if (teklif.userId) {
  company = await db.collection("company_settings").findOne({
    userId: teklif.userId,
  });
}

        // fallback (firma ayarı yoksa patlamasın)
    const firma = {
      name: company?.name || "Kurumsal Tedarikçi",
      address: company?.address || "",
      city: company?.city || "",
      phone: company?.phone || "",
      email: company?.email || "",
      website: company?.website || "www.satistakip.online",
      logoUrl: company?.logoUrl || "", // cloudinary/https link olmalı
    };

    const doc = createPdf(res, {
      title: `Teklif-${teklif.number || id}`,
      fileName: `Teklif-${teklif.number || id}`,
      inline: true,
    });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const left = 40;
    const right = pageWidth - 40;

    // ----------------------------------------------------
    // ✅ HEADER (Logo + Firma bilgisi + Teklif bilgisi)
    // ----------------------------------------------------

    const headerTop = 40;

    // logo
    if (firma.logoUrl) {
      try {
        // pdfkit image sadece local path sever, ama senin PdfEngine içinde url destekleyen çözüm varsa oraya uyarlarız.
        // Şimdilik direkt deniyoruz (yerel ise çalışır).
        await drawLogo(doc, firma.logo, left, headerTop, 65);

      } catch (e) {
        // logo patlarsa pdf bozulmasın
        console.log("Logo basılamadı:", e.message);
      }
    }

    // Firma başlık
    doc
      .fontSize(14)
      .fillColor("#000")
      .text(firma.name, left + 80, headerTop);

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(firma.address ? firma.address : "", left + 80, headerTop + 18);

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(
        `${firma.city ? firma.city : ""}`,
        left + 80,
        headerTop + 32
      );

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`Tel: ${firma.phone || "-"}`, left + 80, headerTop + 46);

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`E-posta: ${firma.email || "-"}`, left + 80, headerTop + 60);

    // Teklif başlığı sağ üst
    doc
      .fontSize(16)
      .fillColor("#000")
      .text("TEKLİF FORM", left, headerTop, { align: "right" });

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(
        `Tarih: ${new Date(teklif.createdAt || Date.now()).toLocaleDateString(
          "tr-TR"
        )}`,
        left,
        headerTop + 22,
        { align: "right" }
      );

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`Teklif No: ${teklif.number || "-"}`, left, headerTop + 36, {
        align: "right",
      });

    // müşteri blok
    doc.moveDown(4);

    doc
      .fontSize(10)
      .fillColor("#000")
      .text(`Cari Ünvan: ${teklif.cariUnvan || "-"}`, left, doc.y + 10);

    doc.moveDown(1);

    // ----------------------------------------------------
    // ✅ TABLO
    // ----------------------------------------------------

    const rowH = 24;
    const startY = doc.y + 10;

    const col = {
      no: left,
      urun: left + 30,
      adet: left + 320,
      birim: left + 375,
      kdv: left + 455,
      toplam: left + 520,
    };

    // Header row background (turuncu)
    doc.rect(left, startY, right - left, rowH).fill("#f59e0b");
    doc.fillColor("#fff").fontSize(10);

    doc.text("#", col.no, startY + 7);
    doc.text("Ürün", col.urun, startY + 7);
    doc.text("Adet", col.adet, startY + 7);
    doc.text("Birim Fiyat", col.birim, startY + 7);
    doc.text("KDV", col.kdv, startY + 7);
    doc.text("Toplam", col.toplam, startY + 7);

    // reset
    doc.fillColor("#000");

    let y = startY + rowH;

    const items = teklif.kalemler || [];

    let araToplam = 0;
    let kdvToplam = 0;
    let genelToplam = 0;

    items.forEach((k, idx) => {
      const adet = Number(k.adet || 0);
      const birimFiyat = Number(k.birimFiyat || 0);
      const kdvOrani = Number(k.kdvOrani || 0);

      const satirAra = adet * birimFiyat;
      const satirKdv = satirAra * (kdvOrani / 100);
      const satirGenel = satirAra + satirKdv;

      araToplam += satirAra;
      kdvToplam += satirKdv;
      genelToplam += satirGenel;

      // sayfa taşması
      if (y > pageHeight - 160) {
        doc.addPage();
        y = 60;
      }

      doc.fontSize(9).fillColor("#000");
      doc.text(String(idx + 1), col.no, y + 7);
      doc.text(String(k.urunAdi || "-"), col.urun, y + 7, {
        width: col.adet - col.urun - 10,
      });
      doc.text(String(adet), col.adet, y + 7);
      doc.text(`${money(birimFiyat)} TL`, col.birim, y + 7);
      doc.text(`${kdvOrani}%`, col.kdv, y + 7);
      doc.text(`${money(satirGenel)} TL`, col.toplam, y + 7);

      // satır çizgi
      doc.moveTo(left, y + rowH).lineTo(right, y + rowH).strokeColor("#e5e5e5").stroke();
      y += rowH;
    });

    // ----------------------------------------------------
    // ✅ TOPLAM KUTUSU
    // ----------------------------------------------------
    const boxW = 250;
    const boxX = right - boxW;
    const boxY = y + 25;

    doc.strokeColor("#000");
    doc.rect(boxX, boxY, boxW, 95).stroke();

    doc.fontSize(11).fillColor("#000");
    doc.text(`Ara Toplam: ${money(araToplam)} TL`, boxX + 12, boxY + 12);
    doc.text(`KDV: ${money(kdvToplam)} TL`, boxX + 12, boxY + 40);

    doc.fontSize(12).fillColor("#000");
    doc.text(`Genel Toplam: ${money(genelToplam)} TL`, boxX + 12, boxY + 68);

    // ----------------------------------------------------
    // ✅ FOOTER
    // ----------------------------------------------------
    doc
      .fontSize(9)
      .fillColor("#666")
      .text(
        `${firma.name} • ${firma.website}`,
        left,
        pageHeight - 45,
        { align: "center" }
      );

    doc.end();
  } catch (err) {
    console.error("PDF VIEW ERROR:", err);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
