import { drawCompanyHeader } from "@/lib/pdf/parts/companyHeader";

export function renderIadeMakbuzuPdf(doc, data) {
  let y;

  const money = (v) =>
    Number(v || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const renderHeader = () => {
    const h = drawCompanyHeader(
      doc,
      data.company,
      {
        title: "İADE MAKBUZU",
        subtitle: data.returnSaleNo,
      },
      "portrait"
    );

    y = h.yStart;

    doc.fontSize(10).text(`Cari: ${data.cari}`, h.startX, y);
    y += 16;

    doc.text(`İade Tarihi: ${data.date}`, h.startX, y);
    y += 16;

    doc.text(`İlgili Satış: ${data.refSaleNo}`, h.startX, y);
    y += 24;

    return h;
  };

  const { startX, tableEndX } = renderHeader();

  // 📦 İade edilen ürünler
  doc.fontSize(10).text("İade Edilen Ürünler", startX, y);
  y += 14;

  doc.fontSize(9);
  data.items.forEach((item) => {
    doc.text(
      `${item.name || ""} - ${item.quantity} x ${money(item.unitPrice)} TL`,
      startX,
      y
    );
    y += 14;
  });

  y += 10;
  doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
  y += 12;

  // 💰 Tutarlar
  doc.fontSize(10).text(`Toplam İade Tutarı: ${money(data.total)} TL`, startX, y);
  y += 18;

  // 💸 Ödeme / mahsup bilgisi
  if (data.refund) {
    doc.text(
      `İade Şekli: ${data.refund.method} - ${money(data.refund.amount)} TL`,
      startX,
      y
    );
    y += 16;
  }

  y += 20;
  doc.fontSize(9).text(
    "Bu belge sistem tarafından oluşturulmuştur.",
    startX,
    y
  );
}
