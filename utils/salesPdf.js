import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Roboto font ekleme
import Roboto from "@/fonts/Roboto-Regular.ttf";
import RobotoBold from "@/fonts/Roboto-Bold.ttf";

export const generateSalePDF = (sale) => {
  const doc = new jsPDF("p", "pt", "a4");

  // Font yükleme
  doc.addFileToVFS("Roboto.ttf", Roboto);
  doc.addFont("Roboto.ttf", "Roboto", "normal");
  doc.setFont("Roboto");

  doc.addFileToVFS("Roboto-Bold.ttf", RobotoBold);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");

  // Başlık
  doc.setFont("Roboto", "bold");
  doc.setFontSize(18);
  doc.text(`SATIŞ FİŞİ – ${sale.saleNo || "-"}`, 40, 50);

  doc.setFont("Roboto", "normal");
  doc.setFontSize(12);

  // Müşteri ve satış bilgileri
  const info = [
    `Müşteri: ${sale.customerName || "-"}`,
    `Fatura No: ${sale.invoiceNo || "-"}`,
    `Sipariş No: ${sale.orderNo || "-"}`,
    `Tarih: ${sale.date?.slice(0, 10) || "-"}`,
    `Para Birimi: ${sale.currency || "-"}`,
  ];

  info.forEach((t, i) => doc.text(t, 40, 80 + i * 18));

  // Satır tablosu
  const tableRows = sale.lines.map((l) => [
    l.productName,
    l.barcode,
    l.qty,
    l.price.toLocaleString("tr-TR"),
    `%${l.kdv}`,
    l.total.toLocaleString("tr-TR"),
  ]);

  autoTable(doc, {
    startY: 180,
    head: [["Ürün", "Barkod", "Adet", "Birim Fiyat", "KDV", "Toplam"]],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [255, 150, 0], textColor: 0 },
    styles: { font: "Roboto", fontSize: 10 },
  });

  // Genel toplam
  const finalY = doc.lastAutoTable.finalY + 30;
  doc.setFont("Roboto", "bold");
  doc.setFontSize(14);
  doc.text(
    `GENEL TOPLAM: ${sale.totalTRY?.toLocaleString("tr-TR")} ${sale.currency}`,
    40,
    finalY
  );

  // Kaydet
  doc.save(`satis-${sale.saleNo || "fis"}.pdf`);
};
