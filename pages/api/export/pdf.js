// 📄 /pages/api/export/pdf.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteği kabul edilir." });
  }

  try {
    const {
      title = "Teklif - Müşteri",
      cari = "Müşteri",
      firma = {},
      items = [],
      kdv = 0,
      genelToplam = 0,
      logo = null,
      not = "",
      teklifNo = "",
    } = req.body || {};

    // 1) Unicode fontu göm (Türkçe için şart)
    const fontDir = path.join(process.cwd(), "public", "fonts");
    const normalTtf = path.join(fontDir, "DejaVuSans.ttf");
    const boldTtf   = path.join(fontDir, "DejaVuSans-Bold.ttf");

    const normalB64 = fs.existsSync(normalTtf) ? fs.readFileSync(normalTtf).toString("base64") : null;
    const boldB64   = fs.existsSync(boldTtf)   ? fs.readFileSync(boldTtf).toString("base64")   : null;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    if (normalB64) {
      doc.addFileToVFS("DejaVuSans.ttf", normalB64);
      doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
    }
    if (boldB64) {
      doc.addFileToVFS("DejaVuSans-Bold.ttf", boldB64);
      doc.addFont("DejaVuSans-Bold.ttf", "DejaVu", "bold");
    }

    const hasUnicode = !!normalB64;
    const setFont = (style = "normal") => {
      if (hasUnicode) doc.setFont("DejaVu", style);
      else doc.setFont("helvetica", style);
    };

    // 2) Üst başlık alanı (wi tarzı)
    // Logo
    if (logo) {
      try {
        doc.addImage(logo, "PNG", 40, 34, 90, 90, undefined, "FAST");
      } catch {}
    }

    // Başlıklar
    setFont("bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 26, 26);
    doc.text("KURUMSAL TEDARİKÇİ / YILDIRIM AYLUÇTARHAN", pageW / 2, 62, { align: "center" });

    setFont("bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 140, 0);
    doc.text((title || "TEKLİF").toUpperCase(), pageW / 2, 82, { align: "center" });

    // Tarih ve Teklif No
    setFont("normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    const tarihStr = new Date().toLocaleDateString("tr-TR");
    const sagUst = [
      `Tarih: ${tarihStr}`,
      teklifNo ? `Teklif No: ${teklifNo}` : "",
    ].filter(Boolean).join("   •   ");
    doc.text(sagUst, pageW - 40, 82, { align: "right" });

    // Başlık alt çizgi
    doc.setDrawColor(255, 140, 0);
    doc.setLineWidth(1.2);
    doc.line(40, 96, pageW - 40, 96);

    // 3) Firma ve Müşteri kartları
    const firmaText = [
      firma.firmaAdi || "Kurumsal Tedarikçi",
      firma.adres || "",
      `Tel: ${firma.telefon || "-"}`,
      `E-posta: ${firma.eposta || "-"}`,
      `Vergi: ${firma.vergiDairesi || "-"} / ${firma.vergiNo || "-"}`,
      firma.web || "www.tedarikci.org.tr",
    ].filter(Boolean).join("\n");

    const cariText =
      typeof cari === "object"
        ? [
            cari.ad || "Müşteri",
            (cari.adres || "").trim(),
            `${cari.il || ""} ${cari.ilce ? "/ " + cari.ilce : ""}`.trim(),
            `Tel: ${cari.telefon || "-"}`,
            `Vergi: ${cari.vergiTipi || "-"} ${cari.vergiNo || "-"}`,
          ]
            .filter(Boolean)
            .join("\n")
        : String(cari || "Müşteri");

    // Kart görünümleri
    const boxH = 92;
    doc.setDrawColor(210);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(40, 112, pageW / 2 - 60, boxH, 8, 8, "FD");
    doc.roundedRect(pageW / 2 + 20, 112, pageW / 2 - 60, boxH, 8, 8, "FD");

    setFont("bold");
    doc.setFontSize(10);
    doc.setTextColor(55, 55, 55);
    doc.text("FİRMA", 52, 128);
    doc.text("MÜŞTERİ", pageW / 2 + 32, 128);

    setFont("normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(firmaText, 52, 144);
    doc.text(cariText, pageW / 2 + 32, 144);

    // 4) Ürün tablosu (wi benzeri)
    const bodyRows = (items || []).map((it, i) => {
      const adet = Number(it.quantity || it.adet || 0);
      const fiyat = Number(it.price || it.fiyat || 0);
      const tutar = adet * fiyat;
      const kdvT = Number(
        it.kdvTutar != null ? it.kdvTutar : (it.kdvOran != null ? (tutar * Number(it.kdvOran)) / 100 : 0)
      );
      return [
        i + 1,
        it.name || it.urun || it.urunAd || "-",
        adet,
        `${fiyat.toFixed(2)} TL`,
        `${kdvT.toFixed(2)} TL`,
        `${(tutar + kdvT).toFixed(2)} TL`,
      ];
    });

    autoTable(doc, {
      startY: 226,
      head: [["#", "Ürün", "Adet", "Birim Fiyat", "KDV", "Toplam"]],
      body: bodyRows.length ? bodyRows : [[1, "-", 1, "0,00 TL", "0,00 TL", "0,00 TL"]],
      styles: {
        font: hasUnicode ? "DejaVu" : "helvetica",
        fontSize: 9,
        cellPadding: 6,
        lineColor: [225, 225, 225],
        lineWidth: 0.4,
      },
      headStyles: {
        fillColor: [255, 140, 0],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 28 },
        2: { halign: "right", cellWidth: 60 },
        3: { halign: "right", cellWidth: 90 },
        4: { halign: "right", cellWidth: 90 },
        5: { halign: "right", cellWidth: 100 },
      },
      theme: "striped",
    });

    let y = doc.lastAutoTable.finalY + 16;

    // 5) Toplam kutucukları (chip)
    const chip = (label, val, x, fill) => {
      doc.setFillColor(...fill);
      doc.roundedRect(x, y, 120, 24, 6, 6, "F");
      setFont("bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(label, x + 10, y + 16);
      setFont("bold");
      doc.text(val, x + 110, y + 16, { align: "right" });
    };

    // gri KDV, turuncu Genel Toplam
    chip("KDV", `${Number(kdv).toFixed(2)} TL`, pageW - 280, [120, 120, 120]);
    chip("GENEL TOPLAM", `${Number(genelToplam).toFixed(2)} TL`, pageW - 150, [255, 140, 0]);

    y += 48;

    // 6) Notlar / Şartlar (süre: 2 gün olarak güncellendi)
    setFont("bold");
    doc.setFontSize(11);
    doc.setTextColor(45, 45, 45);
    doc.text("Notlar / Şartlar", 40, y);

    setFont("normal");
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    const defaultTerms =
      "• Teklif geçerlilik süresi: 2 gündür.\n• Ödeme: Peşin / Havale.\n• Teslim: Stok durumuna göre bilgilendirilecektir.";
    doc.text((not && not.trim()) ? not : defaultTerms, 40, y + 16);

    // 7) İmza alanı
    const signTop = y + 84;
    doc.setDrawColor(210);
    doc.roundedRect(pageW - 220, signTop, 180, 74, 8, 8);
    setFont("bold");
    doc.setFontSize(10);
    doc.setTextColor(55, 55, 55);
    doc.text("Yetkili / İmza", pageW - 210, signTop + 16);
    setFont("normal");
    doc.setTextColor(90, 90, 90);
    doc.text("Ad Soyad:", pageW - 210, signTop + 36);
    doc.text("Tarih - Kaşe - İmza", pageW - 210, signTop + 56);

    // alt çizgi
    doc.setDrawColor(230);
    doc.line(40, signTop + 96, pageW - 40, signTop + 96);

    // 8) Footer (domain güncellendi)
    setFont("normal");
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text("Kurumsal Tedarikçi • www.tedarikci.org.tr", pageW / 2, pageH - 28, { align: "center" });

    // Yanıt: inline PDF
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=teklif.pdf");
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF oluşturma hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
