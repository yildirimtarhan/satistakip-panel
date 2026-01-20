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

  const drawTableHeader = (startX, tableEndX) => {
    // ✅ tablo fontunu küçülttük (sığma için)
    doc.fontSize(8);

    doc.text("Tarih", startX, y);

    // ✅ Açıklama daraltıldı
    doc.text("Açıklama", startX + 70, y);

    // ✅ Kolonlar kompakt yerleşti
    doc.text("Para", startX + 250, y, { width: 35, align: "center" });
    doc.text("Kur", startX + 290, y, { width: 45, align: "right" });

    doc.text("Borç(Dv)", startX + 340, y, { width: 55, align: "right" });
    doc.text("Alacak(Dv)", startX + 400, y, { width: 60, align: "right" });

    doc.text("Borç", startX + 465, y, { width: 50, align: "right" });
    doc.text("Alacak", startX + 520, y, { width: 55, align: "right" });
    doc.text("Bakiye", startX + 580, y, { width: 60, align: "right" });

    y += 12;
    doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
    y += 8;
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
    y += 18;
    drawTableHeader(h.startX, h.tableEndX);
    return h;
  };

  let { startX, tableEndX } = renderHeader();

  (data.rows || []).forEach((r) => {
    if (y > doc.page.height - 80) {
      doc.addPage();
      ({ startX, tableEndX } = renderHeader());
    }

    doc.fontSize(8);

    doc.text(formatDate(r.tarih), startX, y);

    // ✅ Açıklama max width daraldı
    doc.text(r.aciklama || "-", startX + 70, y, { width: 170 });

    // ✅ Para / Kur
    doc.text(r.currency || "TRY", startX + 250, y, {
      width: 35,
      align: "center",
    });

    doc.text(Number(r.fxRate || 1).toFixed(4), startX + 290, y, {
      width: 45,
      align: "right",
    });

    // ✅ Döviz Borç / Alacak
    const isFx = r.currency && r.currency !== "TRY";

    doc.text(isFx && r.borcFCY ? money(r.borcFCY) : "-", startX + 340, y, {
      width: 55,
      align: "right",
    });

    doc.text(isFx && r.alacakFCY ? money(r.alacakFCY) : "-", startX + 400, y, {
      width: 60,
      align: "right",
    });

    // ✅ TL Borç / Alacak / Bakiye
    doc.text(r.borc ? money(r.borc) : "", startX + 465, y, {
      width: 50,
      align: "right",
    });

    doc.text(r.alacak ? money(r.alacak) : "", startX + 520, y, {
      width: 55,
      align: "right",
    });

    doc.text(money(r.bakiye), startX + 580, y, {
      width: 60,
      align: "right",
    });

    y += 15;
  });

  y += 10;
  doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
  y += 14;

  doc.fontSize(10).text(`TOPLAM BORÇ: ${money(data.totalBorc)} TL`, startX, y);
  y += 14;

  doc.text(`TOPLAM ALACAK: ${money(data.totalAlacak)} TL`, startX, y);
  y += 14;

  doc.text(`BAKİYE: ${money(data.bakiye)} TL`, startX, y);

  // ✅ Döviz toplamları varsa alt tarafta göster
  const fxTotals = data.fxTotals || {};
  const fxLines = Object.entries(fxTotals);

  if (fxLines.length > 0) {
    y += 18;
    doc.fontSize(10).text("DÖVİZ TOPLAMLARI:", startX, y);
    y += 14;

    fxLines.forEach(([cur, obj]) => {
      const borc = Number(obj?.borc || 0);
      const alacak = Number(obj?.alacak || 0);
      const net = borc - alacak;

      doc.text(
        `${cur} | Borç: ${money(borc)}  Alacak: ${money(alacak)}  Net: ${money(
          net
        )}`,
        startX,
        y
      );
      y += 14;
    });
  }
}
