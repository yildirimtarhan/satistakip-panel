// lib/pdf/parts/companyHeader.js
export function drawCompanyHeader(doc, company, meta, layout = "portrait") {
  const startX = 40;
  const pageWidth = layout === "landscape" ? 842 : 595;
  const tableEndX = pageWidth - 40;
  
  let y = 40;

  // 🏢 FİRMA BİLGİLERİ (CompanySettings'ten)
  const firmaAdi = company?.firmaAdi || company?.firmaUnvan || "Şirket Adı Belirtilmemiş";
  const vergiDairesi = company?.vergiDairesi || "-";
  const vergiNo = company?.vergiNo || company?.vkn || "-";
  const telefon = company?.telefon || company?.tel || "-";
  const eposta = company?.eposta || company?.email || "-";
  const adres = company?.adres || "-";

  // Sol taraf: Firma bilgileri
  doc.fontSize(12).text(firmaAdi, startX, y, { bold: true });
  y += 15;
  
  doc.fontSize(8);
  doc.text(`Vergi Dairesi: ${vergiDairesi} - Vergi No: ${vergiNo}`, startX, y);
  y += 10;
  doc.text(`Tel: ${telefon} - E-posta: ${eposta}`, startX, y);
  y += 10;
  
  // Adres çok uzunsa kısalt
  const maxAdresLength = 60;
  const displayAdres = adres.length > maxAdresLength 
    ? adres.substring(0, maxAdresLength) + "..." 
    : adres;
  doc.text(`Adres: ${displayAdres}`, startX, y);
  
  // Sağ taraf: Rapor başlığı
  const rightX = pageWidth - 200;
  y = 40;
  
  doc.fontSize(14).text(meta.title || "RAPOR", rightX, y, { align: "right" });
  y += 18;
  doc.fontSize(9).text(meta.subtitle || "", rightX, y, { align: "right" });

  // Çizgi
  y = 85;
  doc.moveTo(startX, y).lineTo(tableEndX, y).stroke();
  y += 15;

  return { startX, tableEndX, yStart: y };
}