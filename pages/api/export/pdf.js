// 📄 /pages/api/export/pdf.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteği kabul edilir." });
  }

  try {
    const {
      title = "Teklif",
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

    // Logo
    if (logo) {
      try {
        doc.addImage(logo, "PNG", 40, 40, 100, 100, undefined, "FAST");
      } catch {
        console.warn("Logo eklenemedi, base64 hatası olabilir.");
      }
    }

    // Başlık
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(title, pageW - 40, 60, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, pageW - 40, 78, { align: "right" });

    // Firma Bilgileri
    const firmaText = [
      firma.firmaAdi,
      firma.adres,
      `Tel: ${firma.telefon || "-"}`,
      `E-posta: ${firma.eposta || "-"}`,
      `Vergi: ${firma.vergiDairesi || "-"} / ${firma.vergiNo || "-"}`,
      firma.web,
    ]
      .filter(Boolean)
      .join("\n");

    const cariText = typeof cari === "object"
      ? [
          cari.ad || "Cari",
          cari.adres || "",
          `${cari.il || ""} / ${cari.ilce || ""}`,
          `Tel: ${cari.telefon || "-"}`,
          `Vergi: ${cari.vergiTipi || "-"} ${cari.vergiNo || "-"}`,
        ]
          .filter(Boolean)
          .join("\n")
      : String(cari);

    doc.roundedRect(40, 150, pageW / 2 - 60, 80, 6, 6);
    doc.roundedRect(pageW / 2 + 20, 150, pageW / 2 - 60, 80, 6, 6);

    doc.setFont("helvetica", "bold");
    doc.text("FİRMA", 52, 166);
    doc.text("MÜŞTERİ", pageW / 2 + 32, 166);
    doc.setFont("helvetica", "normal");
    doc.text(firmaText, 52, 184);
    doc.text(cariText, pageW / 2 + 32, 184);

    // Ürün Tablosu
    const rows = items.map((l, i) => {
      const tutar = Number(l.quantity || 0) * Number(l.price || 0);
      return [
        i + 1,
        l.name || "-",
        l.quantity,
        `${l.price.toFixed(2)} TL`,
        `${((tutar * 20) / 100).toFixed(2)} TL`,
        `${(tutar + (tutar * 20) / 100).toFixed(2)} TL`,
      ];
    });

    autoTable(doc, {
      startY: 260,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 153, 0] },
      head: [["#", "Ürün", "Adet", "Birim Fiyat", "KDV", "Toplam"]],
      body: rows,
      theme: "grid",
    });

    let y = doc.lastAutoTable.finalY + 20;

    // Toplamlar kutusu
    const boxW = 180;
    const box = (label, val, idx) => {
      const x = pageW - 40 - boxW;
      const yy = y + idx * 24;
      doc.roundedRect(x, yy - 14, boxW, 22, 6, 6);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(label, x + 10, yy);
      doc.setFont("helvetica", "normal");
      doc.text(val, x + boxW - 10, yy, { align: "right" });
    };
    box("KDV", `${kdv.toFixed(2)} TL`, 0);
    box("Genel Toplam", `${genelToplam.toFixed(2)} TL`, 1);

    // Notlar
    let noteY = y + 90;
    doc.setFont("helvetica", "bold");
    doc.text("Not / Şartlar", 40, noteY);
    doc.setFont("helvetica", "normal");
    const defaultTerms =
      "• Teklif geçerlilik süresi: 7 gündür.\n• Ödeme: Peşin / Havale.\n• Teslim: Stok durumuna göre bilgilendirilecektir.";
    doc.text(not?.trim() ? not : defaultTerms, 40, noteY + 16);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=teklif.pdf");
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF oluşturma hatası:", err);
    res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
