// 📄 /pages/api/export/pdf.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: "Yalnızca POST isteği kabul edilir." });
  }

  try {
    const {
      title = "Teklif - Müşteri",
      cari = "Müşteri",
      firma = {},
      items = [],
      logo = null,
      not = "",
      teklifNo = "",
      currency = "TL",   // 💱 Para birimi
      rateInfo = "",     // 💱 Kur bilgisi (opsiyonel)
      revNo = 0,         // 🔁 Revize numarası
      onayUrl = "",      // 🌐 Online onay linki (tam URL)
      offerId = "",      // (şimdilik opsiyonel, istersek kullanırız)
      validUntil        // (opsiyonel) geçerlilik tarihi
    } = req.body || {};

    // Online onay URL'sini tek değişkende tutalım
    const approvalUrl = onayUrl || "";

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
      if (fs.existsSync(robotoBold)) {
        boldB64 = fs.readFileSync(robotoBold).toString("base64");
      }
    } else if (fs.existsSync(dejaRegular)) {
      normalB64 = fs.readFileSync(dejaRegular).toString("base64");
      if (fs.existsSync(dejaBold)) {
        boldB64 = fs.readFileSync(dejaBold).toString("base64");
      }
    }

    // 📄 Yatay PDF
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
      orientation: "landscape",
    });
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

    // 🌐 QR kod (online onay linki varsa)
    let qrDataUrl = null;
    if (approvalUrl) {
      try {
        qrDataUrl = await QRCode.toDataURL(approvalUrl);
      } catch (e) {
        console.warn("QR üretilemedi:", e);
      }
    }

    // 🧾 Üst bilgi (logo + başlık)
    if (logo && typeof logo === "string" && logo.startsWith("data:image")) {
      try {
        doc.addImage(logo, "PNG", 40, 30, 90, 90);
      } catch (err) {
        console.warn("Logo eklenemedi:", err.message);
      }
    }

    // QR sağ üst
    if (qrDataUrl) {
      try {
        const size = 80;
        doc.addImage(qrDataUrl, "PNG", pageW - size - 40, 20, size, size);
        setFont("normal");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(
          "Online onay için karekodu okutunuz",
          pageW - size - 40 + size / 2,
          20 + size + 12,
          { align: "center" }
        );
      } catch (e) {
        console.warn("QR PDF'e eklenemedi:", e);
      }
    }

    setFont("bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(
      "KURUMSAL TEDARİKÇİ / YILDIRIM AYLUÇTARHAN",
      pageW / 2,
      60,
      { align: "center" }
    );

    doc.setFontSize(13);
    doc.setTextColor(255, 140, 0);
    doc.text((title || "TEKLİF").toUpperCase(), pageW / 2, 82, {
      align: "center",
    });

    // Tarih + teklif no + revize
    setFont("normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const tarihStr = new Date().toLocaleDateString("tr-TR");
    const infoParts = [
      `Tarih: ${tarihStr}`,
      teklifNo ? `Teklif No: ${teklifNo}` : "",
      revNo ? `Revize: R${revNo}` : "",
    ].filter(Boolean);
    const sagUst = infoParts.join("   •   ");
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
    ]
      .filter(Boolean)
      .join("\n");

    const cariText =
      typeof cari === "object"
        ? [
            cari.ad || "Müşteri",
            cari.adres || "",
            `${cari.il || ""}${cari.ilce ? " / " + cari.ilce : ""}`.trim(),
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
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("FİRMA", 52, 130);
    doc.text("MÜŞTERİ", pageW / 2 + 42, 130);

    setFont("normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(firmaText, 52, 148);
    doc.text(cariText, pageW / 2 + 42, 148);

    // 🧾 Ürün Tablosu
    const bodyRows = (items || []).map((it, i) => {
      const adet = Number(it.quantity || it.adet || 0);
      const fiyat = Number(it.price || it.fiyat || 0);
      const tutar = adet * fiyat;

      const kdvOran = Number(it.kdvOran || 0);
      const kdvTutar =
        it.kdvTutar != null ? Number(it.kdvTutar) : (tutar * kdvOran) / 100;

      return [
        i + 1,
        it.name || it.urun || it.urunAd || "-",
        adet,
        `${fiyat.toFixed(2)} ${currency}`,
        `${kdvTutar.toFixed(2)} ${currency}`,
        `${(tutar + kdvTutar).toFixed(2)} ${currency}`,
      ];
    });

    autoTable(doc, {
      startY: 230,
      head: [["#", "Ürün", "Adet", "Birim Fiyat", "KDV", "Toplam"]],
      body: bodyRows,
      styles: {
        font: normalB64 ? "CustomFont" : "helvetica",
        fontSize: 10,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [255, 140, 0],
        textColor: 255,
        fontStyle: "bold",
      },
      theme: "grid",
    });

    let y = doc.lastAutoTable.finalY + 25;

    // 💵 Ara Toplamlar + Döviz Bilgisi
    const summaryBoxX = pageW - 260;
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(summaryBoxX, y, 220, 110, 8, 8, "F");

    setFont("bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("TOPLAM ÖZET", summaryBoxX + 10, y + 18);

    setFont("normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const araToplam = bodyRows.reduce((sum, row) => {
      const toplamStr = row[5].replace(currency, "").trim();
      return sum + Number(toplamStr || 0);
    }, 0);

    const kdvToplam = bodyRows.reduce((sum, row) => {
      const kdvStr = row[4].replace(currency, "").trim();
      return sum + Number(kdvStr || 0);
    }, 0);

    const genel = araToplam + kdvToplam;

    const summaryLines = [
      [`Ara Toplam`, `${araToplam.toFixed(2)} ${currency}`],
      [`KDV Toplam`, `${kdvToplam.toFixed(2)} ${currency}`],
      [`Genel Toplam`, `${genel.toFixed(2)} ${currency}`],
      rateInfo ? [`Döviz Bilgisi`, rateInfo] : null,
    ].filter(Boolean);

    let sy = y + 42;
    summaryLines.forEach(([label, val]) => {
      setFont("bold");
      doc.text(label, summaryBoxX + 14, sy);
      setFont("normal");
      doc.text(val, summaryBoxX + 160, sy, { align: "right" });
      sy += 18;
    });

    // 💬 Notlar / Şartlar
    const defaultTerms = `
• Firmanız talebi üzerine yukarıda miktar ve birim fiyatları belirtilen ürün teklifinizi onayınıza sunar.
• Teslimat, sipariş onayına istinaden stoktan teslimde aynı gün yapılabilir. Yurt dışı siparişleri 3–6 hafta sürebilir.
• Fiyatlar ${currency} bazındadır. Fatura tarihindeki TCMB döviz kuru esas alınır. Kur farkı güncel kura göre hesaplanır.
• Teklifteki fiyatlar peşin olup KDV dahil değildir.
• Ürünler distribütör garantisindedir (2 yıl).
• Kesin sipariş için teklif mektubunun imzalanarak tarafımıza iletilmesi gerekmektedir.
• Teklif geçerlilik süresi 7 gündür.
──────────────────────────────
💳 Vadeli satışlar için ek şartlar:
• Vade farkı piyasa koşullarına göre belirlenir.
• Temerrüt faizi 3095 Sayılı Kanun ve ilgili mevzuata göre uygulanır.
──────────────────────────────
`;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const termsText = not && not.trim() !== "" ? not : defaultTerms;
    const termsLines = doc.splitTextToSize(termsText, pageW - 80);
    doc.text(termsLines, 40, sy + 40);

    // ✍️ İmza Alanı
    const signY = sy + 40 + termsLines.length * 12 + 25;
    doc.setDrawColor(180, 180, 180);
    doc.roundedRect(pageW - 260, signY, 220, 90, 8, 8);

    setFont("bold");
    doc.text("Yetkili / İmza", pageW - 250, signY + 18);

    setFont("normal");
    doc.text("Ad Soyad:", pageW - 250, signY + 38);
    doc.text("Tarih - Kaşe - İmza", pageW - 250, signY + 58);

    // 📅 Geçerlilik Tarihi
    const validUntilText = validUntil
      ? new Date(validUntil).toLocaleDateString("tr-TR")
      : new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString(
          "tr-TR"
        );

    doc.setFontSize(10);
    doc.text(`Teklif geçerlilik tarihi: ${validUntilText}`, 40, signY + 120);

    // ──────────────── FOOTER ────────────────
    doc.setDrawColor(255, 140, 0);
    doc.line(40, pageH - 60, pageW - 40, pageH - 60);

    setFont("normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(
      "Kurumsal Tedarikçi • www.tedarikci.org.tr • Destek: info@tedarikci.org.tr",
      pageW / 2,
      pageH - 40,
      { align: "center" }
    );

    // 🔗 Online onay linki (alt kısımda yazı olarak)
    if (approvalUrl) {
      setFont("bold");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text("🔗 Teklifi İnceleme & Onay Linki:", 40, pageH - 110);

      setFont("normal");
      doc.setTextColor(0, 102, 204);
      doc.setFontSize(9);
      doc.textWithLink(approvalUrl, 40, pageH - 92, { url: approvalUrl });
    }

    // ─────────────── ✔ PDF OTO DOSYA ADI ───────────────
    const safeName = (cari.ad || cari.cariAd || "musteri")
      .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ ]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase();

    const outputDir = path.join(process.cwd(), "public", "pdfs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const finalFileName = `teklif-${safeName}-${Date.now()}.pdf`;
    const savePath = path.join(outputDir, finalFileName);

    const buffer = Buffer.from(doc.output("arraybuffer"));
    fs.writeFileSync(savePath, buffer);

    console.log("📄 PDF Kaydedildi:", savePath);

    // 🎉 API yanıtı
    return res.status(200).json({
      success: true,
      message: "PDF başarıyla oluşturuldu.",
      pdfUrl: `/pdfs/${finalFileName}`,
      approvalUrl: approvalUrl || null,
    });
  } catch (err) {
    console.error("❌ PDF oluşturma hatası:", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
