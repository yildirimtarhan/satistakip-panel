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
    doc.fontSize(9).text("Tarih", startX, y);
    doc.text("Açıklama", startX + 80, y);
    doc.text("Borç", startX + 300, y, { width: 60, align: "right" });
    doc.text("Alacak", startX + 370, y, { width: 60, align: "right" });
    doc.text("Bakiye", startX + 440, y, { width: 70, align: "right" });
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

    doc.text(formatDate(r.tarih), startX, y);
    doc.text(r.aciklama || "-", startX + 80, y, { width: 210 });
    doc.text(r.borc ? money(r.borc) : "", startX + 300, y, { width: 60, align: "right" });
    doc.text(r.alacak ? money(r.alacak) : "", startX + 370, y, { width: 60, align: "right" });
    doc.text(money(r.bakiye), startX + 440, y, { width: 70, align: "right" });

    y += 16;
  });

  y += 10;
  doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
  y += 14;

  doc.fontSize(10).text(`TOPLAM BORÇ: ${money(data.totalBorc)} TL`, startX, y);
  y += 14;
  doc.text(`TOPLAM ALACAK: ${money(data.totalAlacak)} TL`, startX, y);
  y += 14;
  doc.text(`BAKİYE: ${money(data.bakiye)} TL`, startX, y);
}
