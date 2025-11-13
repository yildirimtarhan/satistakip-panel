// 📄 /pages/api/export/pdf.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteği kabul edilir." });
  }

  try {
    const {
      title = "Teklif",
      cari = {},
      firma = {},
      items = [],
      kdv = 0,
      currency = "TL",
      genelToplam = 0,
      logo = null,
      not = "",
      teklifNo = "",
      teklifId = "",
      token = "",
    } = req.body || {};

    // ✔ FONT
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

    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    if (normalB64) {
      doc.addFileToVFS("Custom-Regular.ttf", normalB64);
      doc.addFont("Custom-Regular.ttf", "CustomFont", "normal");
    }
    if (boldB64) {
      doc.addFileToVFS("Custom-Bold.ttf", boldB64);
      doc.addFont("Custom-Bold.ttf", "CustomFont", "bold");
    }

    const setFont = (style = "normal") => {
      doc.setFont(normalB64 ? "CustomFont" : "helvetica", style);
    };

    // ✔ LOGO
    if (logo && logo.startsWith("data:image")) {
      try {
        doc.addImage(logo, "PNG", 40, 30, 90, 90);
      } catch {}
    }

    // ✔ Başlık
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

    const ustBilgi = [`Tarih: ${tarihStr}`, teklifNo ? `Teklif No: ${teklifNo}` : ""]
      .filter(Boolean)
      .join("   •   ");

    doc.text(ustBilgi, pageW - 60, 82, { align: "right" });

    doc.setDrawColor(255, 140, 0);
    doc.line(40, 96, pageW - 40, 96);

    // ✔ Firma & Müşteri Bilgileri
    const firmaText = [
      firma.firmaAdi || "Kurumsal Tedarikçi",
      firma.adres || "",
      `Tel: ${firma.telefon || "-"}`,
      `E-posta: ${firma.eposta || "-"}`,
      `Vergi: ${firma.vergiDairesi || "-"} / ${firma.vergiNo || "-"}`,
      firma.web || "www.tedarikci.org.tr",
    ]
      .filter(Boolean)
      .join("\n");

    const cariText = [
      cari.ad || "Müşteri",
      cari.adres || "",
      `${cari.il || ""}${cari.ilce ? " / " + cari.ilce : ""}`,
      `Tel: ${cari.telefon || "-"}`,
      `Vergi: ${cari.vergiTipi || "-"} ${cari.vergiNo || "-"}`,
    ]
      .filter(Boolean)
      .join("\n");

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(40, 112, pageW / 2 - 70, 92, 8, 8, "F");
    doc.roundedRect(pageW / 2 + 30, 112, pageW / 2 - 70, 92, 8, 8, "F");

    setFont("bold");
    doc.text("FİRMA", 52, 130);
    doc.text("MÜŞTERİ", pageW / 2 + 42, 130);

    setFont("normal");
    doc.text(firmaText, 52, 148);
    doc.text(cariText, pageW / 2 + 42, 148);

    // ✔ Ürün tablosu
    const bodyRows = (items || []).map((it, i) => {
      const adet = Number(it.quantity || 0);
      const fiyat = Number(it.price || 0);
      const araToplam = adet * fiyat;
      const kdvT = araToplam * (Number(it.kdvOran || 0) / 100);
      return [
        i + 1,
        it.name || "-",
        adet,
        `${fiyat.toFixed(2)} ${currency}`,
        `${kdvT.toFixed(2)} ${currency}`,
        `${(araToplam + kdvT).toFixed(2)} ${currency}`,
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

    // ✔ Şartlar
    const defaultTerms = `
• Ürünler distribütör garantisindedir.
• Fiyatlar peşin olup KDV dahil değildir.
• Teslimat süresi stok durumuna göre değişebilir.
• Teklif geçerlilik süresi 7 gündür.
──────────────────────────────────────
`;

    setFont("normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const splitTerms = doc.splitTextToSize(not.trim() ? not : defaultTerms, pageW - 80);
    doc.text(splitTerms, 40, y);

    // ✔ İmza alanı
    const signTop = y + splitTerms.length * 12 + 30;
    doc.roundedRect(pageW - 240, signTop, 200, 80, 8, 8);
    setFont("bold");
    doc.text("Yetkili / İmza", pageW - 230, signTop + 18);
    setFont("normal");
    doc.text("Ad Soyad:", pageW - 230, signTop + 38);
    doc.text("Tarih - Kaşe - İmza", pageW - 230, signTop + 58);

    // ✔ ONAY LİNKİ + QR CODE
    let approvalUrl = "";
    if (teklifId && token) {
      approvalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.satistakip.online"}/teklif/onay/${teklifId}?token=${token}`;
    }

    if (approvalUrl) {
      setFont("bold");
      doc.setFontSize(12);
      doc.text("🔗 Teklifi İnceleme & Onay Linki:", 40, pageH - 110);

      setFont("normal");
      doc.setTextColor(0, 102, 204);
      doc.textWithLink(approvalUrl, 40, pageH - 90, { url: approvalUrl });

      // QR
      try {
        const qr = await QRCode.toDataURL(approvalUrl);
        doc.addImage(qr, "PNG", pageW - 180, pageH - 170, 120, 120);
      } catch {}
    }

    // ✔ PDF KAYDETME
    const safeName = (cari.ad || "musteri")
      .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ ]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase();

    const outputDir = path.join(process.cwd(), "public", "pdfs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const finalFileName = `teklif-${safeName}-${Date.now()}.pdf`;
    const savePath = path.join(outputDir, finalFileName);

    const buffer = Buffer.from(doc.output("arraybuffer"));
    fs.writeFileSync(savePath, buffer);

    return res.status(200).json({
      success: true,
      pdfUrl: `/pdfs/${finalFileName}`,
      approvalUrl,
    });

  } catch (err) {
    console.error("❌ PDF oluşturma hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
