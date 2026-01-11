import { drawCompanyHeader } from "@/lib/pdf/parts/companyHeader";
export function renderCariEkstrePdf(doc, data) {
  const cleanText = (v) =>
    String(v || "")
      .replace(/[_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const startX = 50;
  const tableEndX = 560;
  let y;

  const money = (v) =>
    Number(v || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDate = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString("tr-TR");
  };

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

  const drawFooter = () => {
    doc.font("Helvetica").fontSize(8);
    doc.text(
      `Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}`,
      0,
      doc.page.height - 40,
      { align: "center" }
    );
  };

  const drawHeader = () => {
    const leftX = startX;
    const rightX = 0;
    const topY = 35;

    // Sol: Firma bilgileri
    doc.font("Helvetica-Bold").fontSize(14);
    doc.text(cleanText(data.company?.name || "SatışTakip ERP"), leftX, topY);

    doc.font("Helvetica").fontSize(9);
    const infoLines = [
      `Vergi Dairesi: ${cleanText(data.company?.taxOffice || "-")}  Vergi No: ${cleanText(data.company?.taxNo || "-")}`,
      `Tel: ${cleanText(data.company?.phone || "-")}  E-posta: ${cleanText(data.company?.email || "-")}`,
      `${cleanText(data.company?.address || "")}`,
    ].filter((x) => x.trim() !== "");

    doc.text(infoLines.join("\n"), leftX, topY + 18, { width: 420 });

    // Sağ: Başlık
    doc.font("Helvetica-Bold").fontSize(13);
    doc.text("CARİ EKSTRESİ", rightX, topY, { align: "right" });

    doc.font("Helvetica").fontSize(10);
    doc.text(`${data.start} - ${data.end}`, rightX, topY + 18, { align: "right" });

    // Çizgi
    doc.moveTo(startX, topY + 60).lineTo(tableEndX, topY + 60).stroke();

    // Cari bilgileri
    y = topY + 75;
    doc.font("Helvetica").fontSize(10);
    doc.text(`Cari: ${cleanText(data.cari)}`, startX, y);
    y += 16;
    doc.text(`Tarih Aralığı: ${data.start} - ${data.end}`, startX, y);

    y += 22;
    drawTableHeader();
  };

  // İlk sayfa
  drawHeader();

  // Satırlar
  (data.rows || []).forEach((r) => {
    if (y > doc.page.height - 80) {
      drawFooter();
      doc.addPage();
      drawHeader();
    }

    doc.text(formatDate(r.tarih), startX, y);
    doc.text(cleanText(r.aciklama || "-"), startX + 80, y, { width: 210 });

    doc.text(r.borc ? money(r.borc) : "", startX + 300, y, {
      width: 60,
      align: "right",
    });

    doc.text(r.alacak ? money(r.alacak) : "", startX + 370, y, {
      width: 60,
      align: "right",
    });

    doc.text(money(r.bakiye), startX + 440, y, { width: 70, align: "right" });

    y += 16;
  });

  // Toplamlar
  if (y > doc.page.height - 120) {
    drawFooter();
    doc.addPage();
    drawHeader();
  }

  y += 10;
  doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
  y += 12;

  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`TOPLAM BORÇ: ${money(data.totalBorc)} TL`, startX, y);
  y += 14;
  doc.text(`TOPLAM ALACAK: ${money(data.totalAlacak)} TL`, startX, y);
  y += 14;
  doc.text(`BAKİYE: ${money(data.bakiye)} TL`, startX, y);

  drawFooter();
}
