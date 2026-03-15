/**
 * E-Fatura taslak PDF – Kurumsal profesyonel tasarım.
 * PdfEngine (createPdfAsBuffer) ile kullanılır.
 */
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { tutarYazili } from "@/utils/tutarYazili";

const BORDER_BLUE = "#1e3a8a";
const ACCENT = "#c6452c";
const TEXT = "#333333";
const LIGHT_BG = "#f8fafc";

const CURRENCY = { TRY: { sym: "TL", label: "Türk Lirası ₺" }, USD: { sym: "$", label: "Amerikan Doları $" }, EUR: { sym: "€", label: "Euro €" } };

/** Kutu çizer (ince siyah kenarlık) */
function drawBox(doc, x, y, w, h) {
  doc.strokeColor("#000000").lineWidth(0.5).rect(x, y, w, h).stroke();
}

/** GİB logosu – önce resim (public/gib-logo.png veya company.gibLogo), yoksa çizim */
function drawGibLogo(doc, cx, cy, r, company = {}) {
  let imgUsed = false;
  if (company?.gibLogo && String(company.gibLogo).startsWith("data:image")) {
    try {
      const base64 = String(company.gibLogo).split("base64,")[1];
      if (base64) {
        doc.image(Buffer.from(base64, "base64"), cx - r, cy - r, { width: r * 2 });
        imgUsed = true;
      }
    } catch (e) {}
  }
  if (!imgUsed) {
    const candidates = [
      path.join(process.cwd(), "public", "gib-logo.png"),
      path.join(process.cwd(), "public", "gib-logo.png.png"),
      path.join(process.cwd(), "public", "images", "gib-logo.png"),
      path.join(process.cwd(), "public", "images", "gib-logo.png.png"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          doc.image(p, cx - r, cy - r, { width: r * 2 });
          imgUsed = true;
          break;
        } catch (e) {}
      }
    }
  }
  if (!imgUsed) {
    doc.save();
    doc.strokeColor(BORDER_BLUE).lineWidth(1.5).circle(cx, cy, r).stroke();
    doc.fontSize(5).fillColor(BORDER_BLUE).font("Roboto");
    doc.text("T.C. HAZİNE VE MALİYE", cx, cy - 14, { align: "center", width: r * 2 });
    doc.text("BAKANLIĞI", cx, cy - 8, { align: "center", width: r * 2 });
    doc.fillColor("#dc2626").rect(cx - 4, cy - 2, 8, 10).fill();
    doc.circle(cx, cy - 6, 2).fill();
    doc.fontSize(4);
    doc.text("GELİR İDARESİ", cx, cy + 8, { align: "center", width: r * 2 });
    doc.text("BAŞKANLIĞI", cx, cy + 13, { align: "center", width: r * 2 });
    doc.restore();
  }
}

/** Base64 veya data URL logo basar */
function drawDataUrlLogo(doc, logo, x, y, w = 50) {
  if (!doc || !logo || typeof logo !== "string") return;
  try {
    if (logo.startsWith("data:image") && logo.includes("base64,")) {
      const base64 = logo.split("base64,")[1];
      if (base64) doc.image(Buffer.from(base64, "base64"), x, y, { width: w });
    }
  } catch (e) {}
}

/**
 * E-Fatura taslak PDF – Kurumsal profesyonel layout
 */
export async function renderEfaturaDraftPdf(doc, draft, company = {}) {
  const paraBirimi = (draft.paraBirimi || company?.paraBirimi || "TRY").toUpperCase();
  const cur = CURRENCY[paraBirimi] || CURRENCY.TRY;
  const pageW = 595;
  const pageH = 842;
  const margin = 35;
  const left = margin;
  const right = pageW - margin;
  const tableW = right - left;

  // ─── ARKA PLAN (multi-tenant uyumlu) ───
  doc.fillColor("#f8fafc").rect(0, 0, pageW, pageH).fill();

  // Filigran logo (çok düşük opaklık – yazılarla çakışmasın)
  if (company?.logo && String(company.logo).startsWith("data:image")) {
    try {
      doc.save();
      doc.opacity(0.03);
      const base64 = String(company.logo).split("base64,")[1];
      if (base64) {
        const wmSize = 280;
        doc.image(Buffer.from(base64, "base64"), (pageW - wmSize) / 2, (pageH - wmSize) / 2 - 30, { width: wmSize });
      }
      doc.restore();
    } catch (e) {}
  }

  doc.fillColor(TEXT);

  // ─── Dekoratif mavi kenarlık (sol + alt) ───
  doc.fillColor(BORDER_BLUE).rect(0, 0, 4, pageH).fill();
  doc.rect(0, pageH - 4, pageW, 4).fill();
  doc.fillColor(TEXT);

  // Üst şerit (profesyonel görünüm)
  doc.fillColor(BORDER_BLUE).rect(0, 0, pageW, 3).fill();
  doc.fillColor(ACCENT).rect(0, 3, pageW, 2).fill();

  // ─── ÜST BÖLÜM: Logo | GİB | QR ───
  const headerY = 25;
  const boxW = 130;
  const centerX = pageW / 2;

  // Sol: Firma logosu + firma adı tam altında (aynı hizada)
  const logoW = 180;
  const logoEstH = 70;
  if (company?.logo && String(company.logo).startsWith("data:image")) {
    drawDataUrlLogo(doc, company.logo, left, headerY - 5, logoW);
  }
  const firmaAdi = company?.firmaAdi || company?.title || company?.companyTitle || "Firma";
  doc.font("Roboto").fontSize(11).fillColor(BORDER_BLUE);
  const firmaAdiY = company?.logo && String(company.logo).startsWith("data:image") ? headerY + logoEstH : headerY + 8;
  doc.text(firmaAdi.toUpperCase(), left, firmaAdiY, {
    width: company?.logo ? logoW : boxW - 55,
    align: company?.logo ? "center" : "left",
  });

  // Orta: GİB logosu (2 kat: r=44) + e-Fatura + Yetkili İmza (aynı hizada)
  const gibR = 44;
  drawGibLogo(doc, centerX, headerY + gibR, gibR, company);
  doc.fontSize(9).fillColor(TEXT);
  doc.text("e-Fatura", centerX - gibR, headerY + gibR * 2 + 8, { align: "center", width: gibR * 2 });
  doc.fontSize(8).text("Yetkili İmza", centerX - gibR, headerY + gibR * 2 + 24, { align: "center", width: gibR * 2 });
  const imzaHeaderY = headerY + gibR * 2 + 34;
  if (company?.imza && String(company.imza).startsWith("data:image")) {
    try {
      const base64 = String(company.imza).split("base64,")[1];
      if (base64) doc.image(Buffer.from(base64, "base64"), centerX - gibR, imzaHeaderY, { width: gibR * 2, height: 44 });
    } catch (e) {}
  } else {
    doc.moveTo(centerX - gibR, imzaHeaderY + 36).lineTo(centerX + gibR, imzaHeaderY + 36).stroke();
  }

  // Sağ: QR kod (ETTN veya doğrulama URL)
  const ettn = draft.uuid || draft.taxtenEttn || "";
  const qrUrl = ettn ? `https://efatura.gib.gov.tr?ettn=${ettn}` : "https://efatura.gib.gov.tr";
  try {
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 70, margin: 1 });
    doc.image(qrDataUrl, right - 75, headerY - 5, { width: 70 });
    doc.fontSize(7).fillColor("#666");
    doc.text("Doğrulama için okutunuz", right - 75, headerY + 68, { width: 70, align: "center" });
  } catch (e) {}
  doc.fillColor(TEXT);

  // ─── SATICI (Sol kutu) | ALICI (Sağ kutu) – büyütülmüş kutular, taşma yok ───
  const boxStartY = 195;
  const boxHeaderH = 22;
  const boxContentH = 82;
  const boxH = boxHeaderH + boxContentH;
  const boxGap = 8;
  const box1W = (tableW - boxGap) / 2;
  const box2X = left + box1W + boxGap;
  const boxPad = 8;
  const boxInnerW = box1W - boxPad * 2;

  /** Metin çiz, sarılmış yüksekliği döndür */
  const drawText = (str, x, y, opts = {}) => {
    if (!str) return y;
    const h = doc.heightOfString(str, { width: opts.width ?? boxInnerW });
    doc.text(str, x, y, { ...opts, width: opts.width ?? boxInnerW });
    return y + h + 3;
  };

  // Sol kutu – Satıcı (başlık kutunun içinde, ortalı)
  doc.fillColor(ACCENT).rect(left, boxStartY, box1W, boxHeaderH).fill();
  doc.fillColor("#ffffff").font("Roboto").fontSize(8);
  const saticiH = doc.heightOfString("SATICI / TEDARİKÇİ", { width: box1W - 16 });
  doc.text("SATICI / TEDARİKÇİ", left, boxStartY + (boxHeaderH - saticiH) / 2 + 2, { width: box1W, align: "center" });
  drawBox(doc, left, boxStartY, box1W, boxH);
  doc.fillColor(LIGHT_BG).rect(left + 1, boxStartY + boxHeaderH + 1, box1W - 2, boxContentH - 2).fill();

  // Sağ kutu – Alıcı (başlık kutunun içinde, ortalı)
  doc.fillColor(ACCENT).rect(box2X, boxStartY, box1W, boxHeaderH).fill();
  doc.fillColor("#ffffff").font("Roboto").fontSize(8);
  const aliciH = doc.heightOfString("ALICI / MÜŞTERİ", { width: box1W - 16 });
  doc.text("ALICI / MÜŞTERİ", box2X, boxStartY + (boxHeaderH - aliciH) / 2 + 2, { width: box1W, align: "center" });
  drawBox(doc, box2X, boxStartY, box1W, boxH);
  doc.fillColor(LIGHT_BG).rect(box2X + 1, boxStartY + boxHeaderH + 1, box1W - 2, boxContentH - 2).fill();

  doc.font("Roboto").fillColor(TEXT);

  // Satıcı içerik – dinamik Y, taşma yok
  let sY = boxStartY + boxHeaderH + boxPad;
  doc.fontSize(9).fillColor(BORDER_BLUE);
  sY = drawText(firmaAdi.toUpperCase(), left + boxPad, sY);
  doc.fontSize(7).fillColor(TEXT);
  const sAdres = [company?.adres || company?.street, company?.buildingNumber, company?.district, company?.city].filter(Boolean).join(" ");
  if (sAdres) sY = drawText(sAdres, left + boxPad, sY);
  const satir2 = [company?.telefon || company?.phone, company?.eposta || company?.email].filter(Boolean).join(" | ");
  if (satir2) sY = drawText(satir2, left + boxPad, sY);
  const sVergi = [company?.vergiDairesi && `VD: ${company.vergiDairesi}`, company?.vergiNo && `VKN: ${company.vergiNo}`].filter(Boolean).join(" ");
  if (sVergi) sY = drawText(sVergi, left + boxPad, sY);
  if (company?.web || company?.website) sY = drawText(company.web || company.website, left + boxPad, sY);

  // Alıcı içerik – dinamik Y, taşma yok
  const customer = draft.customer || {};
  const aliciAd = customer.title || customer.unvan || customer.ad || draft.cariAd || "Müşteri";
  let aY = boxStartY + boxHeaderH + boxPad;
  doc.fontSize(9).fillColor(BORDER_BLUE);
  aY = drawText(`SAYIN ${aliciAd.toUpperCase()}`, box2X + boxPad, aY);
  doc.fontSize(7).fillColor(TEXT);
  const aAdres = [customer.adres || customer.street, customer.district, customer.city].filter(Boolean).join(", ");
  if (aAdres) aY = drawText(aAdres, box2X + boxPad, aY);
  if (customer.email) aY = drawText(`E-Posta: ${customer.email}`, box2X + boxPad, aY);
  const aVergi = [customer.vergiDairesi && `VD: ${customer.vergiDairesi}`, customer.vknTckn && `VKN: ${customer.vknTckn}`].filter(Boolean).join(" ");
  if (aVergi) aY = drawText(aVergi, box2X + boxPad, aY);

  // ─── FATURA BİLGİLERİ – iki sütun ───
  const infoY = boxStartY + boxH + 14;
  const senaryo = draft.scenario === "TEMEL" ? "TEMELFATURA" : "TICARIFATURA";
  const faturaTipi = (draft.invoiceType || draft.tip) === "IADE" ? "IADE" : "SATIS";
  let faturaNo = draft.invoiceNumber || "";
  if (!faturaNo) faturaNo = "KT- (gönderimde atanacak)";
  else if (!String(faturaNo).toUpperCase().startsWith("KT")) faturaNo = `KT- ${faturaNo}`;

  const faturaTarih = draft.issueDate
    ? new Date(draft.issueDate).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : draft.createdAt ? new Date(draft.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";
  const duzenlemeSaat = draft.issueDate
    ? new Date(draft.issueDate).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const vadeTarih = draft.vadeTarihi ? new Date(draft.vadeTarihi).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  doc.font("Roboto").fontSize(8).fillColor(TEXT);
  const infoColW = (right - left) / 2;
  doc.text(`Özelleştirme No: TR1.2`, left, infoY);
  doc.text(`Senaryo: ${senaryo}`, left, infoY + 10);
  doc.text(`Fatura Tipi: ${faturaTipi}`, left, infoY + 20);
  if (ettn) doc.text(`ETTN: ${ettn}`, left, infoY + 30, { width: infoColW - 10 });

  doc.text(`Fatura No: ${faturaNo}`, left + infoColW, infoY);
  doc.text(`Fatura Tarihi: ${faturaTarih}`, left + infoColW, infoY + 10);
  doc.text(`Düzenleme Zamanı: ${duzenlemeSaat}`, left + infoColW, infoY + 20);
  if (vadeTarih) doc.text(`Ödeme Vadesi: ${vadeTarih}`, left + infoColW, infoY + 30);

  // ─── KALEM TABLOSU – sayfa genişliğinde, başlıklar sığacak şekilde ───
  const tableTop = infoY + 45;
  const colW = { sira: 26, urunKod: 44, mal: 198, miktar: 50, birimFiyat: 62, kdvOran: 40, kdvTutar: 52, toplam: 55 };
  const col = {
    sira: left,
    urunKod: left + colW.sira,
    mal: left + colW.sira + colW.urunKod,
    miktar: left + colW.sira + colW.urunKod + colW.mal,
    birimFiyat: left + colW.sira + colW.urunKod + colW.mal + colW.miktar,
    kdvOran: left + colW.sira + colW.urunKod + colW.mal + colW.miktar + colW.birimFiyat,
    kdvTutar: left + colW.sira + colW.urunKod + colW.mal + colW.miktar + colW.birimFiyat + colW.kdvOran,
    toplam: left + colW.sira + colW.urunKod + colW.mal + colW.miktar + colW.birimFiyat + colW.kdvOran + colW.kdvTutar,
  };

  const headerH = 22;
  doc.fillColor(ACCENT).rect(left, tableTop, tableW, headerH).fill();
  doc.font("Roboto").fontSize(9).fillColor("#ffffff");
  doc.text("SIRA", col.sira, tableTop + 7, { width: colW.sira, align: "center" });
  doc.text("ÜRÜN KODU", col.urunKod, tableTop + 7, { width: colW.urunKod, align: "center" });
  doc.text("MAL VE HİZMET", col.mal, tableTop + 7, { width: colW.mal, align: "center" });
  doc.text("MİKTAR", col.miktar, tableTop + 7, { width: colW.miktar, align: "center" });
  doc.text("BİRİM FİYAT", col.birimFiyat, tableTop + 7, { width: colW.birimFiyat, align: "center" });
  doc.text("KDV %", col.kdvOran, tableTop + 7, { width: colW.kdvOran, align: "center" });
  doc.text("KDV TUTARI", col.kdvTutar, tableTop + 7, { width: colW.kdvTutar, align: "center" });
  doc.text("TOPLAM", col.toplam, tableTop + 7, { width: colW.toplam, align: "center" });
  doc.fillColor(TEXT);

  const items = Array.isArray(draft.items) ? draft.items : [];
  let malHizmetToplam = 0;
  const kdvByRate = {};
  const rowH = 18;
  let rowY = tableTop + headerH;

  items.forEach((k, idx) => {
    const rawName = (k.name ?? k.urunAd ?? "-").trim();
    const name = rawName.length > 42 ? rawName.slice(0, 39) + "…" : rawName;
    const kod = (k.code ?? k.urunKod ?? "-").slice(0, 12);
    const quantity = Number(k.quantity ?? k.miktar ?? 0);
    const birim = k.birim || "Adet";
    const unitPrice = Number(k.price ?? k.birimFiyat ?? 0);
    const kdvOran = Number(k.kdvOran ?? k.kdv ?? 20);
    let lineNet = quantity * unitPrice;
    const iskontoOran = Number(k.iskonto ?? k.iskontoOrani ?? 0);
    lineNet -= (lineNet * iskontoOran) / 100;
    const kdvTutar = (lineNet * kdvOran) / 100;
    const lineTotal = lineNet + kdvTutar;

    malHizmetToplam += lineNet;
    kdvByRate[kdvOran] = (kdvByRate[kdvOran] || 0) + kdvTutar;

    const bg = idx % 2 === 1 ? LIGHT_BG : "#ffffff";
    doc.fillColor(bg).rect(left, rowY - 2, tableW, rowH).fill();
    doc.font("Roboto").fontSize(8).fillColor(TEXT);
    doc.text(String(idx + 1), col.sira, rowY + 6, { width: colW.sira, align: "center" });
    doc.text(kod, col.urunKod, rowY + 6, { width: colW.urunKod, align: "center" });
    doc.text(name, col.mal, rowY + 6, { width: colW.mal, align: "left" });
    doc.text(`${quantity.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${birim}`, col.miktar, rowY + 6, { width: colW.miktar, align: "center" });
    doc.text(`${unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${cur.sym}`, col.birimFiyat, rowY + 6, { width: colW.birimFiyat, align: "right" });
    doc.text(kdvOran.toFixed(2), col.kdvOran, rowY + 6, { width: colW.kdvOran, align: "center" });
    doc.text(`${kdvTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${cur.sym}`, col.kdvTutar, rowY + 6, { width: colW.kdvTutar, align: "right" });
    doc.text(`${lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${cur.sym}`, col.toplam, rowY + 6, { width: colW.toplam, align: "right" });
    rowY += rowH;
  });

  const toplamIskonto = Number(draft.genelIskontoTutar ?? 0);
  const hesaplananKdv = Object.values(kdvByRate).reduce((a, b) => a + b, 0);
  const vergilerDahilToplam = draft.totals?.total != null ? Number(draft.totals.total) : malHizmetToplam - toplamIskonto + hesaplananKdv;

  // ─── SOL: Açıklamalar + YAZI_İLE | SAĞ: Toplamlar – toplam kutusu geniş (taşma yok) ───
  const bottomY = rowY + 12;
  const leftSectionWidth = Math.floor(tableW * 0.47);
  const totalsGap = 12;
  const totalsBoxW = tableW - leftSectionWidth - totalsGap;
  const totalsBoxX = left + leftSectionWidth + totalsGap;

  // Sol: Açıklamalar (sabit genişlik – toplamlar ile çakışma yok)
  const aciklama = [draft.aciklama, draft.notlar, draft.notes, draft.not].filter(Boolean).join(" ");
  doc.font("Roboto").fontSize(9).fillColor(TEXT);
  doc.text("AÇIKLAMALAR", left, bottomY);
  if (aciklama) {
    doc.font("Roboto").fontSize(7).text(aciklama.slice(0, 180), left, bottomY + 10, { width: leftSectionWidth });
  }
  const tutarYaziliMetin = tutarYazili(vergilerDahilToplam);
  doc.font("Roboto").fontSize(8).text(`YAZI İLE: ${tutarYaziliMetin}`, left, bottomY + (aciklama ? 26 : 16), { width: leftSectionWidth });

  // Sağ: Toplamlar kutusu – tüm satırlar kutu içinde (Ödenecek Tutar dahil)
  const kdvLineCount = Math.max(1, Object.keys(kdvByRate).length);
  const totH = 88 + kdvLineCount * 10;
  const totPad = 10;
  const labelW = Math.floor(totalsBoxW * 0.58);
  const valueW = totalsBoxW - totPad * 2 - labelW;
  drawBox(doc, totalsBoxX, bottomY, totalsBoxW, totH);
  doc.font("Roboto").fontSize(9).fillColor(TEXT);
  let ty = bottomY + 10;
  doc.text("Toplam", totalsBoxX + totPad, ty, { width: labelW });
  doc.text(`${(malHizmetToplam - toplamIskonto).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${cur.sym}`, totalsBoxX + totPad + labelW, ty, { width: valueW, align: "right" });
  ty += 12;
  doc.text("Toplam İskonto", totalsBoxX + totPad, ty, { width: labelW });
  doc.text(`${toplamIskonto.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${cur.sym}`, totalsBoxX + totPad + labelW, ty, { width: valueW, align: "right" });
  ty += 12;
  const kdvEntries = Object.entries(kdvByRate).sort((a, b) => Number(b[0]) - Number(a[0]));
  if (kdvEntries.length) {
    kdvEntries.forEach(([oran, tutar]) => {
      doc.text(`KDV %${oran}`, totalsBoxX + totPad, ty, { width: labelW });
      doc.text(`${tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${cur.sym}`, totalsBoxX + totPad + labelW, ty, { width: valueW, align: "right" });
      ty += 10;
    });
  } else {
    doc.text("Hesaplanan KDV", totalsBoxX + totPad, ty, { width: labelW });
    doc.text(`${hesaplananKdv.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${cur.sym}`, totalsBoxX + totPad + labelW, ty, { width: valueW, align: "right" });
    ty += 10;
  }
  ty += 6;
  doc.text("Vergiler Dahil Toplam Tutar", totalsBoxX + totPad, ty, { width: labelW });
  doc.text(`${vergilerDahilToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${cur.sym}`, totalsBoxX + totPad + labelW, ty, { width: valueW, align: "right" });
  ty += 16;
  doc.fillColor(LIGHT_BG).rect(totalsBoxX + 2, ty - 2, totalsBoxW - 4, 18).fill();
  doc.fillColor(TEXT).font("Roboto").fontSize(9);
  doc.text("Ödenecek Tutar", totalsBoxX + totPad, ty + 5, { width: labelW });
  doc.text(`${vergilerDahilToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${cur.sym}`, totalsBoxX + totPad + labelW, ty + 5, { width: valueW, align: "right" });

  // ─── ÖDEME KOŞULLARI & BANKA BİLGİLERİ ───
  let bankY = bottomY + totH + 18;

  const vadeStr = vadeTarih || "-";
  const siparisNo = draft.siparisNo || draft.orderNumber || "";
  const platform = draft.platform || draft.tedarikPlatform || "";
  const odemeYontemi = draft.odemeYontemi || company?.krediKartiBilgisi || "";
  const odemeSatirlar = [
    { label: "Ödeme Vadesi", value: vadeStr },
    { label: "Para Birimi", value: cur.sym },
    { label: "Sipariş No", value: siparisNo },
    { label: "Ödeme Yöntemi", value: odemeYontemi },
    { label: "Tedarik Platform", value: platform },
  ];
  const odemeBoxH = 16 + odemeSatirlar.length * 14;

  doc.fillColor(LIGHT_BG).strokeColor(BORDER_BLUE).lineWidth(0.5)
    .rect(left, bankY, tableW, odemeBoxH).fillAndStroke();
  doc.font("Roboto").fontSize(8).fillColor(BORDER_BLUE);
  doc.text("ÖDEME KOŞULLARI", left + 8, bankY + 8);
  doc.fillColor(TEXT).fontSize(7);
  odemeSatirlar.forEach((s, i) => {
    const rowY = bankY + 20 + i * 14;
    doc.text(`${s.label}: ${s.value || "-"}`, left + 8, rowY, { width: tableW - 24 });
  });
  bankY += odemeBoxH + 12;

  const iban = company?.iban;
  const bankContentH = iban ? 24 : 20;
  const bankBoxH = 16 + bankContentH;
  drawBox(doc, left, bankY, tableW, bankBoxH);
  doc.fillColor(ACCENT).rect(left + 1, bankY + 1, tableW - 2, 14).fill();
  doc.fillColor("#ffffff").font("Roboto").fontSize(8);
  doc.text("BANKA HESAP BİLGİLERİ", left, bankY + 6, { width: tableW, align: "center" });
  doc.fillColor(TEXT);

  if (iban) {
    doc.font("Roboto").fontSize(8);
    doc.text("Banka", left + 8, bankY + 20);
    doc.text(company?.bankaAdi || "Banka", left + 65, bankY + 20, { width: 120 });
    doc.text("Hesap No", left + 195, bankY + 20);
    doc.text(company?.hesapNo || "-", left + 255, bankY + 20, { width: 80 });
    doc.text("IBAN", left + 345, bankY + 20);
    doc.fontSize(7).text(String(iban), left + 385, bankY + 20, { width: 140 });
  } else {
    doc.fillColor("#666").font("Roboto").fontSize(7);
    doc.text("Firma ayarlarından banka bilgilerinizi ekleyebilirsiniz.", left + 8, bankY + 22, { width: tableW - 16 });
  }
  bankY += bankBoxH + 12;
  doc.font("Roboto").fontSize(7).fillColor("#555");
  doc.text("İş birliğiniz için teşekkür ederiz. Sorularınız için iletişime geçebilirsiniz.", left, bankY, { width: tableW, align: "center" });
  if (company?.telefon || company?.eposta) {
    const iletisim = [company.telefon, company.eposta].filter(Boolean).join(" • ");
    doc.text(iletisim, left, bankY + 10, { width: tableW, align: "center" });
  }
  bankY += 24;

  // ─── GİB BLOĞU: Damga (çizgiyle çakışma yok) ───
  const gibBlockY = bankY + 14;
  const stampY = gibBlockY;
  doc.fillColor(LIGHT_BG).strokeColor(BORDER_BLUE).lineWidth(0.5)
    .rect(left, stampY, right - left, 20).fillAndStroke();
  doc.font("Roboto").fontSize(8).fillColor(BORDER_BLUE);
  doc.text("T.C. GELİR İDARESİ BAŞKANLIĞI ONAYLI E-FATURA", left, stampY + 9, { align: "center", width: tableW });

  // ─── FOOTER ───
  const footerY = stampY + 34;
  doc.font("Roboto").fontSize(8).fillColor(TEXT);
  doc.text(`${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`, left, footerY);
  doc.text("Doğrulama: https://efatura.gib.gov.tr", right - 5, footerY, { align: "right", width: 200 });

  // ─── HİZMETLERİMİZ – sayfa en altında, yan yana kutucuklar ───
  const hizmetler = company?.hizmetlerimiz
    ? String(company.hizmetlerimiz)
        .split(/[\n,;|]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [
        "Pazar Yeri Entegrasyonu",
        "Yazılım",
        "E-İmza, Mali Mühür, KEP Adresi",
        "ERP & E-Fatura Entegrasyonu",
      ];
  const hizmetCount = Math.max(1, hizmetler.length);
  const hizmetGap = 8;
  const hizmetBoxW = (tableW - (hizmetCount - 1) * hizmetGap) / hizmetCount;
  const hizmetBoxH = 40;
  const hizmetY = pageH - margin - hizmetBoxH - 12;
  const hizmetPad = 8;
  const hizmetTextW = hizmetBoxW - hizmetPad * 2;

  doc.font("Roboto").fontSize(8);
  hizmetler.forEach((h, i) => {
    const hx = left + i * (hizmetBoxW + hizmetGap);
    doc.fillColor(LIGHT_BG).strokeColor(BORDER_BLUE).lineWidth(0.5)
      .rect(hx, hizmetY, hizmetBoxW, hizmetBoxH).fillAndStroke();
    const textH = doc.heightOfString(h, { width: hizmetTextW });
    const textY = hizmetY + (hizmetBoxH - textH) / 2 + 2;
    doc.fillColor(TEXT).text(h, hx + hizmetPad, textY, { width: hizmetTextW, align: "center" });
  });
}
