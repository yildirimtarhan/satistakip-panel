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

    // 📁 Font yolları
    const fontDir = path.join(process.cwd(), "public", "fonts");
    const robotoRegular = path.join(fontDir, "Roboto-Regular.ttf");
    const robotoBold = path.join(fontDir, "Roboto-Bold.ttf");
    const dejaRegular = path.join(fontDir, "DejaVuSans.ttf");
    const dejaBold = path.join(fontDir, "DejaVuSans-Bold.ttf");

    let normalB64 = null;
    let boldB64 = null;
    if (fs.existsSync(robotoRegular)) {
      normalB64 = fs.readFileSync(robotoRegular).toString("base64");
      if (fs.existsSync(robotoBold)) boldB64 = fs.readFileSync(robotoBold).toString("base64");
    } else if (fs.existsSync(dejaRegular)) {
      normalB64 = fs.readFileSync(dejaRegular).toString("base64");
      if (fs.existsSync(dejaBold)) boldB64 = fs.readFileSync(dejaBold).toString("base64");
    }

    // 📄 Yatay PDF
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Fontları yükle
    if (normalB64) {
      doc.addFileToVFS("Custom-Regular.ttf", normalB64);
      doc.addFont("Custom-Regular.ttf", "CustomFont", "normal");
    }
    if (boldB64) {
      doc.addFileToVFS("Custom-Bold.ttf", boldB64);
      doc.addFont("Custom-Bold.ttf", "CustomFont", "bold");
    }

    const setFont = (style = "normal") => {
      if (normalB64) doc.setFont("CustomFont", style);
      else doc.setFont("helvetica", style);
    };

    // 🧾 Üst bilgi
    if (logo && typeof logo === "string" && logo.startsWith("data:image")) {
      try {
        doc.addImage(logo, "PNG", 40, 30, 90, 90);
      } catch (err) {
        console.warn("Logo eklenemedi:", err.message);
      }
    }

    setFont("bold");
    doc.setFontSize(20);
    doc.text("KURUMSAL TEDARİKÇİ / YILDIRIM AYLUÇTARHAN", pageW / 2, 60, { align: "center" });
    doc.setFontSize(13);
    doc.setTextColor(255, 140, 0);
    doc.text((title || "TEKLİF").toUpperCase(), pageW / 2, 82, { align: "center" });

    setFont("normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    const tarihStr = new Date().toLocaleDateString("tr-TR");
    const sagUst = [`Tarih: ${tarihStr}`, teklifNo ? `Teklif No: ${teklifNo}` : ""]
      .filter(Boolean)
      .join("   •   ");
    doc.text(sagUst, pageW - 60, 82, { align: "right" });

    // Alt çizgi
    doc.setDrawColor(255, 140, 0);
    doc.line(40, 96, pageW - 40, 96);

    // 🏢 Firma ve Müşteri
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
            cari.adres || "",
            `${cari.il || ""}${cari.ilce ? " / " + cari.ilce : ""}`,
            `Tel: ${cari.telefon || "-"}`,
            `Vergi: ${cari.vergiTipi || "-"} ${cari.vergiNo || "-"}`,
          ]
            .filter(Boolean)
            .join("\n")
        : String(cari || "Müşteri");

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(40, 112, pageW / 2 - 70, 92, 8, 8, "F");
    doc.roundedRect(pageW / 2 + 30, 112, pageW / 2 - 70, 92, 8, 8, "F");
    setFont("bold");
    doc.text("FİRMA", 52, 130);
    doc.text("MÜŞTERİ", pageW / 2 + 42, 130);
    setFont("normal");
    doc.text(firmaText, 52, 148);
    doc.text(cariText, pageW / 2 + 42, 148);

    // 🧾 Ürün Tablosu
    const bodyRows = (items || []).map((it, i) => {
      const adet = Number(it.quantity || it.adet || 0);
      const fiyat = Number(it.price || it.fiyat || 0);
      const tutar = adet * fiyat;
      const kdvT = Number(
        it.kdvTutar != null
          ? it.kdvTutar
          : it.kdvOran != null
          ? (tutar * Number(it.kdvOran)) / 100
          : 0
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
      startY: 230,
      head: [["#", "Ürün", "Adet", "Birim Fiyat", "KDV", "Toplam"]],
      body: bodyRows,
      styles: { font: normalB64 ? "CustomFont" : "helvetica", fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [255, 140, 0], textColor: 255 },
      theme: "grid",
    });

    let y = doc.lastAutoTable.finalY + 30;

    // 💬 Notlar / Şartlar (satır kaydırmalı)
    const defaultTerms = `
• Firmanız talebi üzerine yukarıda miktar ve birim fiyatları paylaşılmış olan ürün teklifinizi onayınıza sunar.
• Teslimat, sipariş onayına istinaden stoktan teslimde aynı gün sevk edilebilir. Yurtdışı siparişi durumunda 3–6 haftadır.
• Fiyatlar USD bazındadır. Fatura tarihindeki TCMB döviz kuru esas alınır. Kur farkı, güncel kura göre hesaplanır.
• Teklifteki fiyatlar peşin olup KDV dahil değildir.
• Ürünler distribütör garantisindedir (2 yıl).
• Kesin sipariş için teklif mektubunun imzalanarak tarafımıza gönderilmesi gerekir.
• Teklif geçerlilik süresi 7 gündür.
─────────────────────────────
💳 Vadeli satışlar için ek şartlar:
• Vade farkı piyasa koşullarına göre belirlenir.
• Temerrüt faizi 3095 Sayılı Kanuna göre uygulanır.
─────────────────────────────
`;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const splitText = doc.splitTextToSize(not && not.trim() ? not : defaultTerms, pageW - 80);
    doc.text(splitText, 40, y);

    // ✍️ İmza kutusu
    const signTop = y + splitText.length * 12 + 30;
    doc.roundedRect(pageW - 240, signTop, 200, 80, 8, 8);
    setFont("bold");
    doc.text("Yetkili / İmza", pageW - 230, signTop + 18);
    setFont("normal");
    doc.text("Ad Soyad:", pageW - 230, signTop + 38);
    doc.text("Tarih - Kaşe - İmza", pageW - 230, signTop + 58);

    // 📅 Teklif geçerlilik tarihi
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("tr-TR");
    doc.text(`Teklif geçerlilik tarihi: ${validUntil}`, 40, signTop + 110);

    // Footer
    doc.line(40, pageH - 60, pageW - 40, pageH - 60);
    doc.setFontSize(9);
    doc.text("Kurumsal Tedarikçi • www.tedarikci.org.tr", pageW / 2, pageH - 40, { align: "center" });

    // 📥 PDF oluştur ve sunucuya kaydet
    const buffer = Buffer.from(doc.output("arraybuffer"));
    const outputDir = path.join(process.cwd(), "public", "pdfs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `teklif-${Date.now()}.pdf`);
    fs.writeFileSync(filePath, buffer);

    // Yanıt
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=teklif.pdf");
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("❌ PDF oluşturma hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
