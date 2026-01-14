export function renderIptalFisPdf(doc, data) {
  const { company, cari, date, saleNo, amount, note } = data;

  doc.fontSize(14).text(company?.name || "SatışTakip ERP", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(12).text("SATIŞ İPTAL FİŞİ", { align: "right" });
  doc.fontSize(10).text(`Belge No: ${saleNo}`, { align: "right" });

  doc.moveDown();

  doc.fontSize(10).text(`Cari: ${cari}`);
  doc.text(`Tarih: ${date}`);
  doc.moveDown();

  doc.fontSize(11).text(`İptal Tutarı: ${Number(amount).toFixed(2)} TL`, {
    align: "right",
  });

  doc.moveDown();

  if (note) {
    doc.fontSize(9).text(`Açıklama: ${note}`);
  }

  doc.moveDown(2);
  doc.fontSize(9).text("Bu belge sistem tarafından otomatik oluşturulmuştur.", {
    align: "center",
  });
}
