import dbConnect from "@/lib/mongodb";
import Teklif from "@/models/Teklif";
import { createPdf } from "@/lib/PdfEngine";

const money = (n) => {
  const num = Number(n || 0);
  return num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "id gerekli" });

    const teklif = await Teklif.findById(id).lean();
    if (!teklif) return res.status(404).json({ message: "Teklif bulunamadı" });

    const doc = createPdf(res, {
      title: `Teklif-${teklif.number || id}`,
      fileName: `Teklif-${teklif.number || id}`,
      inline: true,
    });

    // ✅ Sayfa ayarları
    const pageWidth = doc.page.width;
    const left = 40;
    const right = pageWidth - 40;

    // ✅ Header
    doc.fontSize(18).text("TEKLİF FORMU", { align: "center" });
    doc.moveDown(0.5);

    doc.fontSize(11);
    doc.text(`Teklif No: ${teklif.number || "-"}`, left, doc.y);
    doc.text(
      `Tarih: ${new Date(teklif.createdAt || Date.now()).toLocaleString("tr-TR")}`,
      { align: "right" }
    );

    doc.moveDown(0.3);
    doc.text(`Cari Ünvan: ${teklif.cariUnvan || "-"}`);
    doc.moveDown(0.8);

    // ✅ TABLO BAŞLIK
    const startY = doc.y;
    const rowH = 22;

    // kolon genişlikleri
    const col = {
      no: left,
      urun: left + 30,
      adet: left + 310,
      birim: left + 360,
      kdvoran: left + 440,
      toplam: left + 500,
    };

    // Başlık satırı arka plan
    doc.rect(left, startY, right - left, rowH).fill("#f2f2f2");
    doc.fillColor("#000").fontSize(10);

    doc.text("#", col.no, startY + 6);
    doc.text("Ürün", col.urun, startY + 6);
    doc.text("Adet", col.adet, startY + 6);
    doc.text("Birim", col.birim, startY + 6);
    doc.text("KDV%", col.kdvoran, startY + 6);
    doc.text("Toplam", col.toplam, startY + 6);

    // Başlık alt çizgi
    doc.moveTo(left, startY + rowH).lineTo(right, startY + rowH).stroke();

    // ✅ TABLO SATIRLARI
    let y = startY + rowH;

    const items = teklif.kalemler || [];

    let araToplam = 0;
    let kdvToplam = 0;
    let genelToplam = 0;

    items.forEach((k, idx) => {
      const adet = Number(k.adet || 0);
      const birimFiyat = Number(k.birimFiyat || 0);
      const kdvOrani = Number(k.kdvOrani || k.kdv || 0);

      const satirAra = adet * birimFiyat;
      const satirKdv = satirAra * (kdvOrani / 100);
      const satirGenel = satirAra + satirKdv;

      araToplam += satirAra;
      kdvToplam += satirKdv;
      genelToplam += satirGenel;

      // sayfa taşarsa yeni sayfa
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 50;
      }

      doc.fontSize(9).fillColor("#000");
      doc.text(String(idx + 1), col.no, y + 6);
      doc.text(String(k.urunAdi || "-"), col.urun, y + 6, { width: col.adet - col.urun - 5 });
      doc.text(String(adet), col.adet, y + 6);
      doc.text(money(birimFiyat), col.birim, y + 6);
      doc.text(String(kdvOrani), col.kdvoran, y + 6);
      doc.text(money(satirGenel), col.toplam, y + 6);

      // satır alt çizgi
      doc.moveTo(left, y + rowH).lineTo(right, y + rowH).strokeColor("#e5e5e5").stroke();

      y += rowH;
    });

    doc.strokeColor("#000");

    doc.moveDown(2);

    // ✅ TOPLAM ALANI (sağda)
    const summaryY = y + 20;
    const boxW = 240;
    const boxX = right - boxW;

    doc.rect(boxX, summaryY, boxW, 90).stroke();

    doc.fontSize(11).fillColor("#000");
    doc.text(`Ara Toplam: ${money(araToplam)} TL`, boxX + 10, summaryY + 12);
    doc.text(`KDV Toplam: ${money(kdvToplam)} TL`, boxX + 10, summaryY + 34);

    doc.fontSize(12).font("Roboto");
    doc.text(`Genel Toplam: ${money(genelToplam)} TL`, boxX + 10, summaryY + 60);

    doc.moveDown(3);

    // ✅ Alt bilgi
    doc
      .fontSize(9)
      .fillColor("#666")
      .text("Bu belge SatışTakip ERP tarafından otomatik oluşturulmuştur.", left, doc.page.height - 50, {
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
