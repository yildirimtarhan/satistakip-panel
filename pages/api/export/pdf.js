// 📄 /pages/api/export/pdf.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { pdfmetrics } from "jspdf";
import { UnicodeCIDFont } from "jspdf-unicode";

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

    // 🔹 Türkçe font desteği
    try {
      pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"));
      doc.setFont("HeiseiKakuGo-W5");
    } catch {
      doc.setFont("helvetica");
    }

    // 🔸 Logo (varsa)
    if (logo) {
      try {
        doc.addImage(logo, "PNG", 40, 35, 80, 80, undefined, "FAST");
      } catch {
        console.warn("⚠️ Logo eklenemedi.");
      }
    }

    // 🔸 Üst başlık
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, "bold");
    doc.text("KURUMSAL TEDARİKÇİ / YILDIRIM AYLUÇTARHAN", pageW / 2, 65, { align: "center" });

    doc.setFontSize(13);
    doc.setTextColor(255, 102, 0);
    doc.setFont(undefined, "normal");
    doc.text(title.toUpperCase(), pageW / 2, 85, { align: "center" });

    // 🔹 Turuncu çizgi
    doc.setDrawColor(255, 140, 0);
    doc.setLineWidth(1);
    doc.line(100, 95, pageW - 100, 95);

    // 🔸 Tarih
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, pageW - 40, 115, { align: "right" });

    // 🔸 Firma / Müşteri kutuları
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

    const boxH = 100;
    doc.setDrawColor(180);
    doc.roundedRect(40, 135, pageW / 2 - 60, boxH, 6, 6);
    doc.roundedRect(pageW / 2 + 20, 135, pageW / 2 - 60, boxH, 6, 6);

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(40);
    doc.text("FİRMA", 52, 152);
    doc.text("MÜŞTERİ", pageW / 2 + 32, 152);

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(70);
    doc.text(firmaText, 52, 168);
    doc.text(cariText, pageW / 2 + 32, 168);

    // 🔸 Ürün tablosu
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
      startY: 260,
      head: [["#", "Ürün", "Adet", "Birim Fiyat", "KDV", "Toplam"]],
      body: rows,
      theme: "grid",
      styles: { fontSize: 9, textColor: [40, 40, 40], lineColor: [230, 230, 230] },
      headStyles: {
        fillColor: [255, 140, 0],
        textColor: 255,
        halign: "center",
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [252, 252, 252] },
    });

    let y = doc.lastAutoTable.finalY + 25;

    // 🔸 Toplam kutuları
    const boxW = 180;
    const box = (label, val, idx, color = [255, 140, 0]) => {
      const x = pageW - 40 - boxW;
      const yy = y + idx * 28;
      doc.setFillColor(...color);
      doc.roundedRect(x, yy - 14, boxW, 22, 6, 6, "F");
      doc.setTextColor(255);
      doc.setFont(undefined, "bold");
      doc.setFontSize(10);
      doc.text(label, x + 10, yy);
      doc.text(val, x + boxW - 10, yy, { align: "right" });
    };
    box("KDV", `${kdv.toFixed(2)} TL`, 0, [120, 120, 120]);
    box("GENEL TOPLAM", `${genelToplam.toFixed(2)} TL`, 1, [255, 140, 0]);

    // 🔸 Notlar
    let noteY = y + 90;
    doc.setDrawColor(220);
    doc.line(40, noteY - 10, pageW - 40, noteY - 10);
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text("Notlar / Şartlar", 40, noteY);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(70);
    const defaultTerms =
      "• Teklif geçerlilik süresi: 7 gündür.\n• Ödeme: Peşin / Havale.\n• Teslim: Stok durumuna göre bilgilendirilecektir.";
    doc.text(not?.trim() ? not : defaultTerms, 40, noteY + 16);

    // 🔸 İmza alanı
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text("Yetkili: ____________________", 40, pageH - 80);
    doc.text("İmza / Kaşe: ____________________", pageW / 2 + 40, pageH - 80);

    // 🔸 Footer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("SatışTakip • www.satistakip.online", pageW / 2, pageH - 30, {
      align: "center",
    });

    // 🔸 PDF çıktısı
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=teklif.pdf");
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF oluşturma hatası:", err);
    res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
