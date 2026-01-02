/**
 * Satış PDF içeriği
 * Layout PdfEngine’den gelir
 */
export function renderSalePdf(doc, data) {
  doc.fontSize(10);

  doc.text(`Cari: ${data.cari}`);
  doc.text(`Tarih: ${data.date}`);
  doc.text(`Satış No: ${data.saleNo || "-"}`);
  doc.moveDown();

  let total = 0;

  data.items.forEach((i, idx) => {
    total += Number(i.total || 0);

    doc.text(
      `${idx + 1}. ${i.name || "-"} | Adet: ${i.quantity} | Birim: ${
        i.unitPrice
      } | Toplam: ${Number(i.total).toLocaleString("tr-TR")} ₺`
    );
  });

  doc.moveDown();
  doc.fontSize(12).text(
    `GENEL TOPLAM: ${total.toLocaleString("tr-TR")} ₺`,
    { align: "right" }
  );
}
