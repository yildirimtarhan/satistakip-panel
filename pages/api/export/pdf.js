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

    // ✅ 1) Unicode font gömme (Türkçe karakterler için)
    const fontDir = path.join(process.cwd(), "public", "fonts");
    const normalTtf = path.join(fontDir, "DejaVuSans.ttf");
    const boldTtf = path.join(fontDir, "DejaVuSans-Bold.ttf");

    const normalB64 = fs.existsSync(normalTtf)
      ? fs.readFileSync(normalTtf).toString("base64")
      : null;
    const boldB64 = fs.existsSync(boldTtf)
      ? fs.readFileSync(boldTtf).toString("base64")
      : null;

    // 📄 2) Yatay PDF başlat
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
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

    // 🧾 3) Üst Bilgi
    if (logo) {
      try {
        doc.addImage(logo, "PNG", 40, 30, 90, 90);
      } catch {}
    }

    setFont("bold");
    doc.setFontSize(20);
    doc.setTextColor(20, 20, 20);
    doc.text("KURUMSAL TEDARİKÇİ / YILDIRIM AYLUÇTARHAN", pageW / 2, 60, { align: "center" });

    doc.setFontSize(13);
    doc.setTextColor(255, 140, 0);
    doc.text((title || "TEKLİF").toUpperCase(), pageW / 2, 82, { align: "center" });

    setFont("normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const tarihStr = new Date().toLocaleDateString("tr-TR");
    const sagUst = [
      `Tarih: ${tarihStr}`,
      teklifNo ? `Teklif No: ${teklifNo}` : "",
    ]
      .filter(Boolean)
      .join("   •   ");
    doc.text(sagUst, pageW - 60, 82, { align: "right" });

    doc.setDrawColor(255, 140, 0);
    doc.setLineWidth(1);
    doc.line(40, 96, pageW - 40, 96);

    // 🏢 4) Firma ve Müşteri Bilgileri
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

    const boxH = 90;
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(40, 112, pageW / 2 - 70, boxH, 8, 8, "F");
    doc.roundedRect(pageW / 2 + 30, 112, pageW / 2 - 70, boxH, 8, 8, "F");

    setFont("bold");
    doc.setFontSize(11);
    doc.text("FİRMA", 52, 130);
    doc.text("MÜŞTERİ", pageW / 2 + 42, 130);

    setFont("normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(firmaText, 52, 148);
    doc.text(cariText, pageW / 2 + 42, 148);

    // 🧾 5) Ürün Tablosu
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
      startY: 220,
      head: [["#", "Ürün", "Adet", "Birim Fiyat", "KDV", "Toplam"]],
      body: bodyRows.length ? bodyRows : [[1, "-", 1, "0,00 TL", "0,00 TL", "0,00 TL"]],
      styles: {
        font: hasUnicode ? "DejaVu" : "helvetica",
        fontSize: 10,
        cellPadding: 6,
        lineColor: [200, 200, 200],
        lineWidth: 0.5,
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
      theme: "grid",
    });

    let y = doc.lastAutoTable.finalY + 24;

    // 💰 6) Toplam Bilgileri
    const chip = (label, val, x, color) => {
      doc.setFillColor(...color);
      doc.roundedRect(x, y, 140, 26, 6, 6, "F");
      setFont("bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(label, x + 10, y + 17);
      doc.text(val, x + 130, y + 17, { align: "right" });
    };

    chip("KDV", `${Number(kdv).toFixed(2)} TL`, pageW - 340, [110, 110, 110]);
    chip("GENEL TOPLAM", `${Number(genelToplam).toFixed(2)} TL`, pageW - 190, [255, 140, 0]);

    y += 50;

    // 📝 7) Notlar / Şartlar
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

    // ✍️ 8) İmza Alanı
    const signTop = y + 80;
    doc.setDrawColor(210);
    doc.roundedRect(pageW - 240, signTop, 200, 80, 8, 8);
    setFont("bold");
    doc.setFontSize(11);
    doc.text("Yetkili / İmza", pageW - 230, signTop + 18);
    setFont("normal");
    doc.setFontSize(10);
    doc.text("Ad Soyad:", pageW - 230, signTop + 38);
    doc.text("Tarih - Kaşe - İmza", pageW - 230, signTop + 58);

    // 🔻 Alt çizgi + Footer
    doc.setDrawColor(230);
    doc.line(40, pageH - 60, pageW - 40, pageH - 60);

    setFont("normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Kurumsal Tedarikçi • www.tedarikci.org.tr", pageW / 2, pageH - 40, { align: "center" });

    // 📤 Yanıt
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=teklif.pdf");
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF oluşturma hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
