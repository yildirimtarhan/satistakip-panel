export function renderCariEkstrePdf(doc, data) {
  const pageWidth = doc.page.width;
  const startX = 50;
  const tableEndX = 560;

  let y;

  const money = (v) =>
    Number(v || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  /**
   * === HEADER ===
   */
  const drawHeader = () => {
    doc.font("Helvetica-Bold").fontSize(16);
    doc.text(data.company?.name || "SatışTakip ERP", 0, 40, { align: "center" });

    doc.fontSize(12);
    doc.text("CARİ EKSTRESİ", 0, 62, { align: "center" });

    doc.font("Helvetica").fontSize(10);
    doc.text(`${data.start} - ${data.end}`, 0, 80, { align: "center" });

    y = 120;

    doc.font("Helvetica").fontSize(10);
    doc.text(`Cari: ${data.cari}`, startX, y);
    y += 16;
    doc.text(`Tarih Aralığı: ${data.start} - ${data.end}`, startX, y);

    y += 24;
    drawTableHeader();
  };

  /**
   * === TABLO BAŞLIĞI ===
   */
  const drawTableHeader = () => {
    doc.font("Helvetica-Bold").fontSize(9);

    doc.text("Tarih", startX, y);
    doc.text("Açıklama", startX + 80, y);
    doc.text("Borç", startX + 300, y, { width: 60, align: "right" });
    doc.text("Alacak", startX + 370, y, { width: 60, align: "right" });
    doc.text("Bakiye", startX + 440, y, { width: 70, align: "right" });

    y += 10;
    doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
    y += 8;

    doc.font("Helvetica").fontSize(9);
  };

  /**
   * === FOOTER ===
   */
  const drawFooter = () => {
    doc.font("Helvetica").fontSize(8);
    doc.text(
      `Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}`,
      0,
      doc.page.height - 40,
      { align: "center" }
    );
  };

  // === İLK SAYFA ===
  drawHeader();

  /**
   * === SATIRLAR ===
   */
  data.rows.forEach((r) => {
    if (y > doc.page.height - 80) {
      drawFooter();
      doc.addPage();
      drawHeader();
    }

    doc.text(
      new Date(r.tarih).toLocaleDateString("tr-TR"),
      startX,
      y
    );

    doc.text(r.aciklama || "-", startX + 80, y, { width: 210 });

    doc.text(
      r.borc ? money(r.borc) : "",
      startX + 300,
      y,
      { width: 60, align: "right" }
    );

    doc.text(
      r.alacak ? money(r.alacak) : "",
      startX + 370,
      y,
      { width: 60, align: "right" }
    );

    doc.text(
      money(r.bakiye),
      startX + 440,
      y,
      { width: 70, align: "right" }
    );

    y += 16;
  });

  /**
   * === TOPLAM ALANI ===
   */
  if (y > doc.page.height - 120) {
    drawFooter();
    doc.addPage();
    drawHeader();
  }

  y += 10;
  doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
  y += 12;

  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`TOPLAM BORÇ: ${money(data.totalBorc)} ₺`, startX, y);
  y += 14;

  doc.text(`TOPLAM ALACAK: ${money(data.totalAlacak)} ₺`, startX, y);
  y += 14;

  doc.text(`BAKİYE: ${money(data.bakiye)} ₺`, startX, y);

  drawFooter();
}
