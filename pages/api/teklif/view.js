import { connectToDatabase } from "@/lib/mongodb";
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
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "id gerekli" });

    // ✅ DB
    const { db } = await connectToDatabase();

    // ✅ teklif
    const teklif = await Teklif.findById(id).lean();
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    // ✅ MULTI TENANT firma ayarı userId’den çek
    let company = null;
    if (teklif.userId) {
      company = await db.collection("company_settings").findOne({
        userId: teklif.userId,
      });
    }

    // ✅ fallback
    const firma = {
      name: company?.firmaAdi || "Kurumsal Tedarikçi",
      address: company?.adres || "",
      city: company?.il || "",
      phone: company?.telefon || "",
      email: company?.eposta || "",
      website: company?.web || "www.tedarikci.org.tr",
      logoUrl: company?.logo || "",
    };

    // ✅ Geçerlilik (3 gün)
    const teklifTarihi = teklif.createdAt ? new Date(teklif.createdAt) : new Date();
    const gecerlilikBaslangic = new Date(teklifTarihi);
    const gecerlilikBitis = new Date(teklifTarihi);
    gecerlilikBitis.setDate(gecerlilikBitis.getDate() + 3);

    const trDate = (d) =>
      new Date(d).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

    // ✅ PDF START
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
    // ✅ HEADER
    // ----------------------------------------------------
    const headerTop = 40;

    // ✅ logo
    if (firma.logoUrl) {
      try {
        await drawLogo(doc, firma.logoUrl, left, headerTop, 55);
      } catch (e) {
        console.log("Logo basılamadı:", e.message);
      }
    }

    // ✅ Firma başlık
    doc
      .fontSize(13)
      .fillColor("#000")
      .text(firma.name, left + 70, headerTop);

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(firma.address || "", left + 70, headerTop + 18, {
        width: 260,
      });

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`${firma.city || ""}`, left + 70, headerTop + 34);

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`Tel: ${firma.phone || "-"}`, left + 70, headerTop + 48);

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`E-posta: ${firma.email || "-"}`, left + 70, headerTop + 62);

    // ✅ Teklif başlığı sağ üst
    doc
      .fontSize(16)
      .fillColor("#000")
      .text("TEKLİF FORM", left, headerTop, { align: "right" });

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`Tarih: ${trDate(teklifTarihi)}`, left, headerTop + 22, {
        align: "right",
      });

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`Teklif No: ${teklif.number || "-"}`, left, headerTop + 36, {
        align: "right",
      });

    // ✅ Geçerlilik Tarihleri (Profesyonel blok)
    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`Geçerlilik Başlangıç: ${trDate(gecerlilikBaslangic)}`, left, headerTop + 52, {
        align: "right",
      });

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`Geçerlilik Bitiş: ${trDate(gecerlilikBitis)}`, left, headerTop + 66, {
        align: "right",
      });

    doc.moveDown(4);

    doc
      .fontSize(10)
      .fillColor("#000")
      .text(`Cari Ünvan: ${teklif.cariUnvan || "-"}`, left, doc.y + 10);

    doc.moveDown(1);

    // ----------------------------------------------------
    // ✅ TABLO (PROFESYONEL HİZALAMA)
    // ----------------------------------------------------
    const rowH = 24;
    const startY = doc.y + 10;

    const tableWidth = right - left;

    // ✅ Column widths (sabit ve kayma yapmaz)
    const colW = {
      no: 25,
      urun: 250,
      adet: 50,
      birim: 75,
      kdv: 50,
      toplam: tableWidth - (25 + 250 + 50 + 75 + 50), // kalan alan
    };

    const colX = {
      no: left,
      urun: left + colW.no,
      adet: left + colW.no + colW.urun,
      birim: left + colW.no + colW.urun + colW.adet,
      kdv: left + colW.no + colW.urun + colW.adet + colW.birim,
      toplam:
        left + colW.no + colW.urun + colW.adet + colW.birim + colW.kdv,
    };

    // ✅ Header row
    doc.rect(left, startY, tableWidth, rowH).fill("#f59e0b");
    doc.fillColor("#fff").fontSize(10);

    doc.text("#", colX.no + 5, startY + 7, { width: colW.no - 5 });
    doc.text("Ürün", colX.urun + 5, startY + 7, { width: colW.urun - 10 });

    doc.text("Adet", colX.adet, startY + 7, {
      width: colW.adet,
      align: "center",
    });

    doc.text("Birim", colX.birim, startY + 7, {
      width: colW.birim,
      align: "right",
    });

    doc.text("KDV", colX.kdv, startY + 7, {
      width: colW.kdv,
      align: "center",
    });

    doc.text("Toplam", colX.toplam, startY + 7, {
      width: colW.toplam,
      align: "right",
    });

    doc.fillColor("#000");

    let y = startY + rowH;
    const items = teklif.kalemler || [];

    let araToplam = 0;
    let kdvToplam = 0;
    let genelToplam = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const k = items[idx];

      const adet = Number(k.adet || 0);
      const birimFiyat = Number(k.birimFiyat || 0);
      const kdvOrani = Number(k.kdvOrani || 0);

      const satirAra = adet * birimFiyat;
      const satirKdv = satirAra * (kdvOrani / 100);
      const satirGenel = satirAra + satirKdv;

      araToplam += satirAra;
      kdvToplam += satirKdv;
      genelToplam += satirGenel;

      // ✅ alt boşluk kontrolü
      if (y > pageHeight - 260) {
        doc.addPage();
        y = 60;
      }

      doc.fontSize(9).fillColor("#000");

      doc.text(String(idx + 1), colX.no + 5, y + 7, {
        width: colW.no - 5,
      });

      doc.text(String(k.urunAdi || "-"), colX.urun + 5, y + 7, {
        width: colW.urun - 10,
        ellipsis: true,
      });

      doc.text(String(adet), colX.adet, y + 7, {
        width: colW.adet,
        align: "center",
      });

      doc.text(`${money(birimFiyat)} TL`, colX.birim, y + 7, {
        width: colW.birim,
        align: "right",
      });

      doc.text(`${kdvOrani}%`, colX.kdv, y + 7, {
        width: colW.kdv,
        align: "center",
      });

      doc.text(`${money(satirGenel)} TL`, colX.toplam, y + 7, {
        width: colW.toplam,
        align: "right",
      });

      // çizgi
      doc
        .moveTo(left, y + rowH)
        .lineTo(right, y + rowH)
        .strokeColor("#e5e5e5")
        .stroke();

      y += rowH;
    }

    // ----------------------------------------------------
    // ✅ TOPLAM KUTUSU
    // ----------------------------------------------------
    const boxW = 260;
    const boxH = 95;
    const boxX = right - boxW;
    const boxY = Math.min(y + 25, pageHeight - 360);

    doc.strokeColor("#000");
    doc.rect(boxX, boxY, boxW, boxH).stroke();

    doc.fontSize(11).fillColor("#000");
    doc.text(`Ara Toplam: ${money(araToplam)} TL`, boxX + 12, boxY + 12);

    doc.text(`KDV: ${money(kdvToplam)} TL`, boxX + 12, boxY + 40);

    doc.fontSize(12).fillColor("#000");
    doc.text(`Genel Toplam: ${money(genelToplam)} TL`, boxX + 12, boxY + 68);

    // ----------------------------------------------------
    // ✅ BANKA + NOTLAR + İMZA (PROFESYONEL BLOK)
    // ----------------------------------------------------
    let infoY = boxY + boxH + 20;

    // Sayfa sonuna çok yaklaşırsa yeni sayfa
    if (infoY > pageHeight - 220) {
      doc.addPage();
      infoY = 60;
    }

    // ✅ Banka Bloğu (Sol)
    doc.fontSize(11).fillColor("#000").text("BANKA HESAP BİLGİLERİMİZ", left, infoY);

    doc.fontSize(9).fillColor("#333");
    doc.text("Banka: TOM-BANK", left, infoY + 18);
    doc.text("Hesap Sahibi: YILDIRIM AYLUÇTARHAN", left, infoY + 32);
    doc.text("IBAN: TR69 0021 3000 0007 7934 7000 01", left, infoY + 46);

    // ✅ Notlar Bloğu (Sağ)
    const notesX = left + 290;
    doc.fontSize(11).fillColor("#000").text("NOTLAR / TEKLİF ŞARTLARI", notesX, infoY);

    doc.fontSize(9).fillColor("#333");

    const notes = [
      "1. Teklifimiz teklif tarihinden itibaren 3 gün geçerli olup, geçerlilik bitiş tarihi PDF üzerinde ayrıca belirtilmiştir.",
      "2. Ürün/ hizmet bedelleri belirtilen miktar ve koşullar için geçerlidir.",
      "3. Teslimat süresi, ödeme onayı ve stok durumuna göre değişiklik gösterebilir.",
      "4. Ödeme yöntemi: Havale / EFT.",
      "5. Sipariş onayı sonrası fiyat değişimi veya iptal talepleri, satıcı değerlendirmesiyle sonuçlandırılır.",
      "6. Taraflar arasında doğabilecek uyuşmazlıklarda Türk Hukuku geçerlidir.",
      "7. Döviz cinsinden düzenlenen teklif ve faturalarda, ödeme günü oluşacak TL karşılığı hesaplamasında T.C. Merkez Bankası Döviz Satış Kuru esas alınır.",
    ];

    let ny = infoY + 18;
    for (const line of notes) {
      doc.text(line, notesX, ny, {
        width: right - notesX,
      });
      ny += 14;
    }

    // ✅ İmza/Kaşe Alanı
    const signY = Math.max(ny + 15, infoY + 115);

    // Sayfa sonuna yaklaşırsa yeni sayfa
    let finalSignY = signY;
    if (finalSignY > pageHeight - 120) {
      doc.addPage();
      finalSignY = 60;
    }

    doc.fontSize(10).fillColor("#000");
    doc.text("Onaylayan Müşteri:", left, finalSignY);
    doc.text("Tarih:", left + 310, finalSignY);

    doc.fontSize(9).fillColor("#333");
    doc.text("______________________________", left, finalSignY + 18);
    doc.text("____ / ____ / ________", left + 310, finalSignY + 18);

    doc.fontSize(10).fillColor("#000");
    doc.text("İmza / Kaşe:", left, finalSignY + 45);

    doc.fontSize(9).fillColor("#333");
    doc.text("______________________________", left, finalSignY + 63);

    // ----------------------------------------------------
    // ✅ FOOTER
    // ----------------------------------------------------
    doc
      .fontSize(9)
      .fillColor("#666")
      .text(`${firma.name} • ${firma.website}`, left, pageHeight - 45, {
        align: "center",
        width: right - left,
      });

    doc.end();
  } catch (err) {
    console.error("PDF VIEW ERROR:", err);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
