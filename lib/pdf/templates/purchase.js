/**
 * Alış PDF içeriği
 * Sadece içerik üretir – layout PdfEngine’den gelir
 */
export function renderPurchasePdf(doc, data) {
  doc.fontSize(10);

  doc.text(`Cari: ${data.cari}`);
  doc.text(`Tarih: ${data.date}`);
  doc.text(`Belge No: ${data.ref || "-"}`);
  doc.moveDown();

  if (data.cancelled) {
    doc
      .fontSize(14)
      .fillColor("red")
      .text("İPTAL EDİLMİŞTİR", { align: "center" })
      .fillColor("black");
    doc.moveDown();
  }

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
