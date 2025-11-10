// 📄 /pages/api/export/pdf.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteği kabul edilir." });
  }

  try {
    const {
      title = "Teklif Formu",
      cari = "Müşteri",
      firma = {},
      items = [],
      kdv = 0,
      genelToplam = 0,
      logo = null,
      not = "",
    } = req.body || {};

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // 🔸 Logo & Başlık
    if (logo) {
      try {
        doc.addImage(logo, "PNG", 40, 40, 90, 90, undefined, "FAST");
      } catch {
        console.warn("⚠️ Logo eklenemedi.");
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text("KURUMSAL TEDARİKÇİ", pageW / 2, 60, { align: "center" });

    doc.setFontSize(13);
    doc.setTextColor(255, 128, 0);
    doc.text(title.toUpperCase(), pageW / 2, 80, { align: "center" });

    // Tarih ve No
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, pageW - 40, 100, { align: "right" });

    // 🔸 Firma & Müşteri Bilgileri
    const firmaText = [
      firma.firmaAdi || "Kurumsal Tedarikçi",
      firma.adres || "",
      `Tel: ${firma.telefon || "-"}`,
      `E-posta: ${firma.eposta || "-"}`,
      `Vergi: ${firma.vergiDairesi || "-"} / ${firma.vergiNo || "-"}`,
      firma.web || "www.tedarikci.org.tr",
    ].filter(Boolean).join("\n");

    const cariText = typeof cari === "object"
      ? [
          cari.ad || "Müşteri",
          cari.adres || "",
          `${cari.il || ""} / ${cari.ilce || ""}`,
          `Tel: ${cari.telefon || "-"}`,
          `Vergi: ${cari.vergiTipi || "-"} ${cari.vergiNo || "-"}`,
        ].filter(Boolean).join("\n")
      : String(cari);

    doc.setDrawColor(200);
    doc.roundedRect(40, 130, pageW / 2 - 60, 90, 6, 6);
    doc.roundedRect(pageW / 2 + 20, 130, pageW / 2 - 60, 90, 6, 6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("FİRMA", 52, 146);
    doc.text("MÜŞTERİ", pageW / 2 + 32, 146);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(firmaText, 52, 162);
    doc.text(cariText, pageW / 2 + 32, 162);

    // 🔸 Ürün Tablosu
    const rows = items.map((l, i) => {
      const tutar = Number(l.quantity || 0) * Number(l.price || 0);
      const kdvTutar = tutar * 0.2;
      return [
        i + 1,
        l.name || "-",
        l.quantity || 0,
        `${Number(l.price || 0).toFixed(2)} TL`,
        `${kdvTutar.toFixed(2)} TL`,
        `${(tutar + kdvTutar).toFixed(2)} TL`,
      ];
    });

    autoTable(doc, {
      startY: 250,
      head: [["#", "Ürün", "Adet", "Birim Fiyat", "KDV", "Toplam"]],
      body: rows,
      styles: { fontSize: 9, lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: {
        fillColor: [255, 140, 0],
        textColor: 255,
        halign: "center",
        fontSize: 10,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      bodyStyles: { textColor: 50 },
      theme: "striped",
    });

    let y = doc.lastAutoTable.finalY + 20;

    // 🔸 Toplamlar
    const boxW = 180;
    const box = (label, val, idx, color = [255, 140, 0]) => {
      const x = pageW - 40 - boxW;
      const yy = y + idx * 26;
      doc.setFillColor(...color);
      doc.roundedRect(x, yy - 14, boxW, 22, 6, 6, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(label, x + 10, yy);
      doc.text(val, x + boxW - 10, yy, { align: "right" });
    };
    box("KDV", `${kdv.toFixed(2)} TL`, 0, [120, 120, 120]);
    box("GENEL TOPLAM", `${genelToplam.toFixed(2)} TL`, 1, [255, 140, 0]);

    // 🔸 Notlar
    let noteY = y + 90;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Notlar / Şartlar", 40, noteY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const defaultTerms =
      "• Teklif geçerlilik süresi: 7 gündür.\n• Ödeme: Peşin / Havale.\n• Teslim: Stok durumuna göre bilgilendirilecektir.";
    doc.text(not?.trim() ? not : defaultTerms, 40, noteY + 16);

    // 🔸 Footer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      "SatışTakip • www.satistakip.online",
      pageW / 2,
      pageH - 30,
      { align: "center" }
    );

    // PDF çıktısı
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=teklif.pdf");
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF oluşturma hatası:", err);
    res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
