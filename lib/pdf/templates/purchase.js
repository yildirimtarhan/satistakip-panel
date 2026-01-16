/**
 * Alış PDF içeriği
 * Sadece içerik üretir – layout PdfEngine’den gelir
 */
export function renderPurchasePdf(doc, data) {
  doc.fontSize(11);

  // ✅ CARİ FIX (string değilse de yazdır)
  const cari =
    data?.cariUnvan ||
    data?.cariAdi ||
    data?.cariName ||
    data?.cari ||
    data?.accountName ||
    "-";

  const date = data?.date || data?.tarih || data?.createdAt || "-";
  const ref = data?.ref || data?.belgeNo || data?.faturaNo || data?.invoiceNo || "-";

  doc.text(`Cari: ${cari}`);
  doc.text(`Tarih: ${String(date).slice(0, 10)}`);
  doc.text(`Belge No: ${ref}`);
  doc.moveDown(1);

  if (data?.cancelled || data?.iptal || data?.status === "iptal") {
    doc
      .fontSize(14)
      .fillColor("red")
      .text("İPTAL EDİLMİŞTİR", { align: "center" })
      .fillColor("black");
    doc.moveDown(1);
  }

  // ✅ items normalize
  const itemsRaw = data?.items || data?.satirlar || data?.kalemler || [];
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];

  let araToplam = 0;
  let kdvToplam = 0;
  let genelToplam = 0;

  doc.fontSize(11).text("Ürün Kalemleri:", { underline: true });
  doc.moveDown(0.5);

  if (!items.length) {
    doc.fontSize(11).text("Ürün bulunamadı.");
    doc.moveDown(1);
  } else {
    items.forEach((i, idx) => {
      const name = i?.name || i?.urunAdi || i?.urunAd || i?.urun || "-";
      const quantity = Number(i?.quantity ?? i?.adet ?? i?.qty ?? 0);
      const unitPrice = Number(i?.unitPrice ?? i?.birimFiyat ?? i?.price ?? 0);

      // ✅ KDV oranı normalize (product vatRate destekli)
      const vatRate = Number(
        i?.vatRate ?? i?.kdvOrani ?? i?.kdv ?? 20
      );

      const lineNet = quantity * unitPrice;
      const lineVat = (lineNet * vatRate) / 100;
      const lineTotal = lineNet + lineVat;

      araToplam += Number(lineNet || 0);
      kdvToplam += Number(lineVat || 0);
      genelToplam += Number(lineTotal || 0);

      doc.text(
        `${idx + 1}. ${name} | Adet: ${quantity} | Birim: ${unitPrice.toLocaleString(
          "tr-TR"
        )} ₺ | KDV: %${vatRate} | Toplam: ${lineTotal.toLocaleString("tr-TR")} ₺`
      );
    });

    doc.moveDown(1);
  }

  // ✅ TOPLAMLAR
  doc.fontSize(12).text(`Ara Toplam: ${araToplam.toLocaleString("tr-TR")} ₺`, {
    align: "right",
  });
  doc.fontSize(12).text(`KDV Toplam: ${kdvToplam.toLocaleString("tr-TR")} ₺`, {
    align: "right",
  });
  doc.fontSize(13).text(
    `GENEL TOPLAM: ${genelToplam.toLocaleString("tr-TR")} ₺`,
    { align: "right" }
  );
}
