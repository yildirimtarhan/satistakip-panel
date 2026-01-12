export function drawCompanyHeader(doc, company, { title, subtitle } = {}, layout = "portrait") {
  const clean = (v) =>
    String(v || "")
      .replace(/[_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const startX = 50;
  const tableEndX = layout === "landscape" ? 790 : 560;
  const topY = 35;

  doc.fontSize(14).text(clean(company?.name || "SatışTakip ERP"), startX, topY);

  doc.fontSize(9).text(
    [
      `Vergi Dairesi: ${clean(company?.taxOffice || "-")}  Vergi No: ${clean(company?.taxNo || "-")}`,
      `Tel: ${clean(company?.phone || "-")}  E-posta: ${clean(company?.email || "-")}`,
      clean(company?.address || ""),
    ].filter(Boolean).join("\n"),
    startX,
    topY + 18,
    { width: 420 }
  );

  doc.fontSize(13).text(clean(title), 0, topY, { align: "right" });
  if (subtitle) {
    doc.fontSize(10).text(clean(subtitle), 0, topY + 18, { align: "right" });
  }

  doc.moveTo(startX, topY + 60).lineTo(tableEndX, topY + 60).stroke();

  return { startX, tableEndX, yStart: topY + 75 };
}
