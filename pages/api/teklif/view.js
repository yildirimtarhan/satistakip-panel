// 📁 pages/api/teklif/view.js
import dbConnect, { connectToDatabase } from "@/lib/mongodb";
import Teklif from "@/models/Teklif";
import { createPdf, drawLogo } from "@/lib/pdf/PdfEngine";

const money = (n) => {
  const num = Number(n || 0);
  return num.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDateTR = (date) => {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("tr-TR");
  } catch (e) {
    return "-";
  }
};

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "id gerekli" });

    // ✅ teklif
    const teklif = await Teklif.findById(id).lean();
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    // ✅ MULTI TENANT: firmayı teklif.userId üzerinden company_settings'ten çek
    // pages/api/settings/company.js aynı koleksiyonu kullanıyor ✅
    const { db } = await connectToDatabase();

    let company = null;
    if (teklif.userId) {
      company = await db.collection("company_settings").findOne({
        userId: teklif.userId,
      });
    }

    // ✅ Firma fallback (ayar yoksa patlamasın)
    const firma = {
      firmaAdi: company?.firmaAdi || "Kurumsal Tedarikçi",
      yetkili: company?.yetkili || "",
      telefon: company?.telefon || "",
      eposta: company?.eposta || "",
      web: company?.web || "www.satistakip.online",
      vergiDairesi: company?.vergiDairesi || "",
      vergiNo: company?.vergiNo || "",
      adres: company?.adres || "",
      logo: company?.logo || "",
    };

    // ✅ PDF başlat
    const doc = createPdf(res, {
      title: `Teklif-${teklif.number || id}`,
      fileName: `Teklif-${teklif.number || id}`,
      inline: true,
    });

    // ✅ Sayfa ölçüleri
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const left = 40;
    const right = pageWidth - 40;
    const contentWidth = right - left;

    // ----------------------------------------------------
    // ✅ HEADER (Logo + Firma bilgisi + Teklif bilgisi)
    // ----------------------------------------------------
    const headerTop = 40;

    // Logo
    if (firma.logo) {
      try {
        // drawLogo PdfEngine içinde URL/Buffer/Path destekliyorsa direkt bu olur ✅
        await drawLogo(doc, firma.logo, left, headerTop, 65);
      } catch (e) {
        console.log("Logo basılamadı:", e.message);
      }
    }

    // Firma Adı
    doc
      .fontSize(14)
      .fillColor("#000")
      .text(firma.firmaAdi, left + 80, headerTop);

    // Yetkili (✅ doğru yer HEADER)
    if (firma.yetkili) {
      doc
        .fontSize(9)
        .fillColor("#333")
        .text(`Yetkili: ${firma.yetkili}`, left + 80, headerTop + 18);
    }

    // Firma Adres
    if (firma.adres) {
      doc
        .fontSize(9)
        .fillColor("#333")
        .text(firma.adres, left + 80, headerTop + 34, {
          width: 260,
        });
    }

    // İletişim
    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`Tel: ${firma.telefon || "-"}`, left + 80, headerTop + 60);

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`E-posta: ${firma.eposta || "-"}`, left + 80, headerTop + 74);

    // Teklif Başlığı (sağ)
    doc
      .fontSize(16)
      .fillColor("#000")
      .text("TEKLİF FORMU", left, headerTop, {
        align: "right",
      });

    const teklifTarih = teklif.createdAt || Date.now();

    // Geçerlilik: 3 gün
    const baslangicTarihi = new Date(teklifTarih);
    const bitisTarihi = new Date(teklifTarih);
    bitisTarihi.setDate(bitisTarihi.getDate() + 3);

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`Tarih: ${formatDateTR(teklifTarih)}`, left, headerTop + 22, {
        align: "right",
      });

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`Teklif No: ${teklif.number || "-"}`, left, headerTop + 36, {
        align: "right",
      });

    doc
      .fontSize(9)
      .fillColor("#333")
      .text(
        `Geçerlilik: ${formatDateTR(baslangicTarihi)} - ${formatDateTR(
          bitisTarihi
        )}`,
        left,
        headerTop + 50,
        { align: "right" }
      );

    // Müşteri bilgisi
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
    let startY = doc.y + 10;

    // Kolon genişlikleri (sabit, kayma yapmaz)
    const colW = {
      no: 22,
      urun: 265,
      adet: 40,
      birim: 75,
      kdv: 45,
      toplam: 85,
    };

    const colX = {
      no: left,
      urun: left + colW.no,
      adet: left + colW.no + colW.urun,
      birim: left + colW.no + colW.urun + colW.adet,
      kdv: left + colW.no + colW.urun + colW.adet + colW.birim,
      toplam:
        left +
        colW.no +
        colW.urun +
        colW.adet +
        colW.birim +
        colW.kdv,
    };

    // Header arka plan
    doc.rect(left, startY, contentWidth, rowH).fill("#f59e0b");
    doc.fillColor("#fff").fontSize(10);

    doc.text("#", colX.no + 5, startY + 7, { width: colW.no - 5 });
    doc.text("Ürün", colX.urun + 5, startY + 7, { width: colW.urun - 10 });
    doc.text("Adet", colX.adet, startY + 7, {
      width: colW.adet,
      align: "center",
    });
    doc.text("Birim", colX.birim, startY + 7, {
      width: colW.birim,
      align: "center",
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

    const ensureSpace = (need) => {
      if (y + need > pageHeight - 210) {
        doc.addPage();
        y = 60;
      }
    };

    items.forEach((k, idx) => {
      ensureSpace(rowH + 10);

      const adet = Number(k.adet || 0);
      const birimFiyat = Number(k.birimFiyat || 0);
      const kdvOrani = Number(k.kdvOrani || 0);

      const satirAra = adet * birimFiyat;
      const satirKdv = satirAra * (kdvOrani / 100);
      const satirGenel = satirAra + satirKdv;

      araToplam += satirAra;
      kdvToplam += satirKdv;
      genelToplam += satirGenel;

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
        align: "center",
      });

      doc.text(`${kdvOrani}%`, colX.kdv, y + 7, {
        width: colW.kdv,
        align: "center",
      });

      doc.text(`${money(satirGenel)} TL`, colX.toplam, y + 7, {
        width: colW.toplam,
        align: "right",
      });

      // Satır çizgisi
      doc
        .strokeColor("#e5e5e5")
        .moveTo(left, y + rowH)
        .lineTo(right, y + rowH)
        .stroke();

      y += rowH;
    });

    // ----------------------------------------------------
    // ✅ TOPLAM KUTUSU
    // ----------------------------------------------------
    ensureSpace(160);

    const boxW = 250;
    const boxX = right - boxW;
    const boxY = y + 20;

    doc.strokeColor("#000");
    doc.rect(boxX, boxY, boxW, 95).stroke();

    doc.fontSize(11).fillColor("#000");
    doc.text(`Ara Toplam: ${money(araToplam)} TL`, boxX + 12, boxY + 12);
    doc.text(`KDV: ${money(kdvToplam)} TL`, boxX + 12, boxY + 40);

    doc.fontSize(12).fillColor("#000");
    doc.text(`Genel Toplam: ${money(genelToplam)} TL`, boxX + 12, boxY + 68);

    // ----------------------------------------------------
    // ✅ BANKA + ŞARTLAR + İMZA ALANI
    // ----------------------------------------------------
    const infoY = boxY + 125;

    // Sayfa altına sığmıyorsa yeni sayfa aç
    if (infoY > pageHeight - 220) {
      doc.addPage();
      y = 60;
    }

    const sectionY = Math.max(y + 40, infoY);

    const leftColW = (contentWidth - 20) / 2;
    const rightColW = leftColW;

    const leftColX = left;
    const rightColX = left + leftColW + 20;

    // ✅ Banka bilgileri
    doc.fontSize(10).fillColor("#000").text("BANKA HESAP BİLGİLERİMİZ", leftColX, sectionY);

    doc.fontSize(9).fillColor("#333");
    doc.text("Banka: TOM-BANK", leftColX, sectionY + 16);
    doc.text("Hesap Sahibi: YILDIRIM AYLUÇTARHAN", leftColX, sectionY + 30);
    doc.text("IBAN: TR69 0021 3000 0007 7934 7000 01", leftColX, sectionY + 44);

    // ✅ Notlar / Şartlar (üst üste binmeyi engellemek için width + continued yok)
    doc.fontSize(10).fillColor("#000").text("NOTLAR / TEKLİF ŞARTLARI", rightColX, sectionY);

    const terms = [
      "1) Teklifimiz teklif tarihinden itibaren 3 gün geçerli olup, geçerlilik süresi bitiminde fiyatlar değişebilir.",
      "2) Ödeme/teslimat süreçleri sipariş onayı ve stok durumuna göre değerlendirilir.",
      "3) Sipariş onayı sonrası fiyat değişimi veya iptal talepleri satıcı değerlendirmesiyle sonuçlandırılır.",
      "4) Teslimat/servis süreleri tedarikçi ve kargo süreçlerine bağlı olarak değişebilir.",
      "5) Yabancı para birimiyle düzenlenen teklif ve faturalarda, ödeme günü oluşacak TL karşılığı hesaplamasında T.C. Merkez Bankası Döviz Satış Kuru esas alınır.",
    ];

    let termY = sectionY + 16;

    doc.fontSize(8.4).fillColor("#333");

    terms.forEach((t) => {
      doc.text(t, rightColX, termY, {
        width: rightColW,
        align: "left",
      });
      termY = doc.y + 4;
    });

    // ✅ İmza/Kaşe Alanı (banka bloğunun altı)
    const signY = Math.max(termY + 10, sectionY + 85);

    let finalSignY = signY;
    if (finalSignY > pageHeight - 120) {
      doc.addPage();
      finalSignY = 60;
    }

    doc.fontSize(9).fillColor("#000");
    doc.text("Onaylayan Müşteri:", leftColX, finalSignY);

    doc
      .strokeColor("#333")
      .moveTo(leftColX, finalSignY + 18)
      .lineTo(leftColX + 180, finalSignY + 18)
      .stroke();

    doc.text("İmza / Kaşe:", leftColX, finalSignY + 35);

    doc
      .strokeColor("#333")
      .moveTo(leftColX, finalSignY + 53)
      .lineTo(leftColX + 180, finalSignY + 53)
      .stroke();

    // ----------------------------------------------------
    // ✅ FOOTER
    // ----------------------------------------------------
    doc
      .fontSize(9)
      .fillColor("#666")
      .text(`${firma.firmaAdi} • ${firma.web}`, left, pageHeight - 45, {
        align: "center",
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
