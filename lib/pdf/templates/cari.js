// lib/pdf/templates/cari.js
import { drawCompanyHeader } from "@/lib/pdf/parts/companyHeader";

export function renderCariEkstrePdf(doc, data) {
  let y;

  const money = (v) =>
    Number(v || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("tr-TR") : "-";

  // 🎯 SÜTUN GENİŞLİKLERİ
  const cols = {
    tarih: { x: 0, w: 45 },
    aciklama: { x: 50, w: 110 },
    para: { x: 165, w: 35 },
    kur: { x: 205, w: 45 },
    borcDV: { x: 255, w: 65 },
    alacakDV: { x: 325, w: 65 },
    borcTL: { x: 395, w: 65 },
    alacakTL: { x: 465, w: 65 },
    bakiye: { x: 535, w: 65 },
  };

  const drawTableHeader = (startX, tableEndX) => {
    doc.fontSize(8);
    
    doc.text("Tarih", startX + cols.tarih.x, y, { width: cols.tarih.w });
    doc.text("Açıklama", startX + cols.aciklama.x, y, { width: cols.aciklama.w });
    doc.text("Para", startX + cols.para.x, y, { width: cols.para.w, align: "center" });
    doc.text("Kur", startX + cols.kur.x, y, { width: cols.kur.w, align: "right" });
    doc.text("Borç(Dv)", startX + cols.borcDV.x, y, { width: cols.borcDV.w, align: "right" });
    doc.text("Alacak(Dv)", startX + cols.alacakDV.x, y, { width: cols.alacakDV.w, align: "right" });
    doc.text("Borç", startX + cols.borcTL.x, y, { width: cols.borcTL.w, align: "right" });
    doc.text("Alacak", startX + cols.alacakTL.x, y, { width: cols.alacakTL.w, align: "right" });
    doc.text("Bakiye", startX + cols.bakiye.x, y, { width: cols.bakiye.w, align: "right" });

    y += 12;
    doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
    y += 10;
  };

  const renderHeader = () => {
    const h = drawCompanyHeader(
      doc,
      data.company,
      { title: "CARİ EKSTRESİ", subtitle: `${data.start} - ${data.end}` },
      "landscape"
    );

    y = h.yStart;

    doc.fontSize(10).text(`Cari: ${data.cari}`, h.startX, y);
    y += 20;

    drawTableHeader(h.startX, h.tableEndX);

    return h;
  };

  let { startX, tableEndX } = renderHeader();

  // 📋 SATIRLAR
  (data.rows || []).forEach((r) => {
    if (y > doc.page.height - 200) {
      doc.addPage();
      ({ startX, tableEndX } = renderHeader());
    }

    doc.fontSize(7.5);

    doc.text(formatDate(r.tarih), startX + cols.tarih.x, y, { width: cols.tarih.w });
    
    const aciklama = r.aciklama || "-";
    const maxLength = 22;
    const displayAciklama = aciklama.length > maxLength 
      ? aciklama.substring(0, maxLength) + "..." 
      : aciklama;
    doc.text(displayAciklama, startX + cols.aciklama.x, y, { width: cols.aciklama.w });

    doc.text(r.currency || "TRY", startX + cols.para.x, y, { width: cols.para.w, align: "center" });
    doc.text(Number(r.fxRate || 1).toFixed(4), startX + cols.kur.x, y, { width: cols.kur.w, align: "right" });

    // ✅ BORÇ (DÖVİZ) - Sadece dövizli işlemlerde göster
    if (r.currency !== "TRY" && r.borcDV > 0) {
      doc.text(`${money(r.borcDV)} ${r.currency}`, startX + cols.borcDV.x, y, { 
        width: cols.borcDV.w, 
        align: "right" 
      });
    } else {
      doc.text("-", startX + cols.borcDV.x, y, { width: cols.borcDV.w, align: "right" });
    }

    // ✅ ALACAK (DÖVİZ) - Sadece dövizli işlemlerde göster
    if (r.currency !== "TRY" && r.alacakDV > 0) {
      doc.text(`${money(r.alacakDV)} ${r.currency}`, startX + cols.alacakDV.x, y, { 
        width: cols.alacakDV.w, 
        align: "right" 
      });
    } else {
      doc.text("-", startX + cols.alacakDV.x, y, { width: cols.alacakDV.w, align: "right" });
    }

    doc.text(money(r.borc), startX + cols.borcTL.x, y, { width: cols.borcTL.w, align: "right" });
    doc.text(money(r.alacak), startX + cols.alacakTL.x, y, { width: cols.alacakTL.w, align: "right" });
    doc.text(money(r.bakiye), startX + cols.bakiye.x, y, { width: cols.bakiye.w, align: "right" });

    y += 14;
  });

  // ✅ TOPLAM SATIRI - EKRANLA BİREBİR AYNI
  y += 5;
  doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
  y += 12;

  doc.fontSize(8).text("TOPLAM", startX + cols.tarih.x, y, { bold: true });
  
  // Döviz toplamları (TRY hariç)
  const dovizCurrencies = Object.keys(data.currencyTotals || {}).filter(
    (c) => c !== "TRY" && (data.currencyTotals[c].borc > 0 || data.currencyTotals[c].alacak > 0)
  );

  if (dovizCurrencies.length > 0) {
    const borcDVText = dovizCurrencies
      .filter((c) => data.currencyTotals[c].borc > 0)
      .map((c) => `${money(data.currencyTotals[c].borc)} ${c}`)
      .join("\n");
    const alacakDVText = dovizCurrencies
      .filter((c) => data.currencyTotals[c].alacak > 0)
      .map((c) => `${money(data.currencyTotals[c].alacak)} ${c}`)
      .join("\n");

    if (borcDVText) {
      doc.fontSize(8).text(borcDVText, startX + cols.borcDV.x, y, {
        width: cols.borcDV.w,
        align: "right",
        bold: true,
      });
    }
    if (alacakDVText) {
      doc.fontSize(8).text(alacakDVText, startX + cols.alacakDV.x, y, {
        width: cols.alacakDV.w,
        align: "right",
        bold: true,
      });
    }
  }
  
  // ✅ Sadece TL Toplamlar
  doc.fontSize(8);
  doc.text(money(data.totalBorc), startX + cols.borcTL.x, y, { 
    width: cols.borcTL.w, 
    align: "right", 
    bold: true 
  });
  doc.text(money(data.totalAlacak), startX + cols.alacakTL.x, y, { 
    width: cols.alacakTL.w, 
    align: "right", 
    bold: true 
  });
  doc.text(money(data.bakiye), startX + cols.bakiye.x, y, { 
    width: cols.bakiye.w, 
    align: "right", 
    bold: true 
  });

  y += 25;

  // ✅ TOPLAMLAR BÖLÜMÜ - EKRANLA BİREBİR AYNI
  doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
  y += 12;

  doc.fontSize(10).text("TOPLAMLAR:", startX, y, { bold: true });
  y += 18;

  const currencies = ["TRY", "USD", "EUR"].filter(c => {
    const t = data.currencyTotals?.[c];
    return t && (t.borcTL > 0 || t.alacakTL > 0);
  });

  currencies.forEach((curr) => {
    const t = data.currencyTotals[curr];
    
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }

    doc.fontSize(9);
    
    if (curr === "TRY") {
      // TRY için sadece TL formatı
      const bakiyeTL = t.borcTL - t.alacakTL;
      doc.text(
        `TRY  ⏵  Borç: ${money(t.borcTL)} TL  |  Alacak: ${money(t.alacakTL)} TL  |  Bakiye: ${money(bakiyeTL)} TL`,
        startX,
        y
      );
    } else {
      // ✅ Döviz için hem döviz hem TL - DOĞRU DEĞERLER
      const dvBorc = t.borc;           // Döviz borç miktarı
      const dvAlacak = t.alacak;       // Döviz alacak miktarı
      const dvBakiye = dvBorc - dvAlacak;
      
      const tlBorc = t.borcTL;         // ✅ TL karşılığı borç (doğru değer)
      const tlAlacak = t.alacakTL;     // ✅ TL karşılığı alacak (doğru değer)
      const tlBakiye = tlBorc - tlAlacak;
      
      // ✅ Format: USD ⏵ Borç: 3.040,00 USD (132.331,09 TL)
      doc.text(
        `${curr}  ⏵  Borç: ${money(dvBorc)} ${curr} (${money(tlBorc)} TL)  |  ` +
        `Alacak: ${money(dvAlacak)} ${curr} (${money(tlAlacak)} TL)  |  ` +
        `Bakiye: ${money(dvBakiye)} ${curr} (${money(tlBakiye)} TL)`,
        startX,
        y
      );
    }
    
    y += 16;
  });

  // Genel Bakiye
  y += 10;
  doc.fontSize(12).text(`GENEL BAKİYE: ${money(data.bakiye)} TL`, startX, y, { bold: true });
}
