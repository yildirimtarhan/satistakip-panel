export function drawCompanyHeader(doc, company, { title, subtitle }, layout) {
  const startX = 50;
  const tableEndX = layout === "landscape" ? 790 : 560; // A4 landscape daha geniş
  const topY = 35;

  const cleanText = (v) =>
    String(v || "").replace(/[_]/g, " ").replace(/\s+/g, " ").trim();

  // Sol
  doc.font("Helvetica-Bold").fontSize(14);
  doc.text(cleanText(company?.name || "SatışTakip ERP"), startX, topY);

  doc.font("Helvetica").fontSize(9);
  const infoLines = [
    `Vergi Dairesi: ${cleanText(company?.taxOffice || "-")}  Vergi No: ${cleanText(company?.taxNo || "-")}`,
    `Tel: ${cleanText(company?.phone || "-")}  E-posta: ${cleanText(company?.email || "-")}`,
    `${cleanText(company?.address || "")}`,
  ].filter((x) => x.trim() !== "");

  doc.text(infoLines.join("\n"), startX, topY + 18, { width: 420 });

  // Sağ
  doc.font("Helvetica-Bold").fontSize(13);
  doc.text(title, 0, topY, { align: "right" });

  doc.font("Helvetica").fontSize(10);
  if (subtitle) doc.text(subtitle, 0, topY + 18, { align: "right" });

  // Çizgi
  doc.moveTo(startX, topY + 60).lineTo(tableEndX, topY + 60).stroke();

  return { startX, tableEndX, yStart: topY + 75 };
}
