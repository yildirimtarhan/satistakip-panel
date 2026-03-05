// E-Fatura taslağı PDF – Taxten örnek faturasına göre düzenlenmiş tasarım (KT fatura no, bloklar, tablo)
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { tutarYazili } from "@/utils/tutarYazili";

function resolveFont(filename) {
  const candidates = [
    path.join(process.cwd(), "public/fonts", filename),
    path.join(process.cwd(), "lib/pdf/fonts", filename),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function registerRoboto(doc) {
  const regular = resolveFont("Roboto-Regular.ttf");
  if (!regular) {
    throw new Error("Roboto-Regular.ttf bulunamadı. public/fonts veya lib/pdf/fonts içine ekleyin.");
  }
  doc.registerFont("Roboto", regular);
  doc.font("Roboto");
}

/** Logo data URL ise PDF'e basar */
async function drawLogo(doc, logo, x, y, w) {
  if (!doc || !logo || typeof logo !== "string") return;
  const src = logo.trim();
  try {
    if (src.startsWith("data:image") && src.includes("base64,")) {
      const base64 = src.split("base64,")[1];
      if (base64) {
        const buf = Buffer.from(base64, "base64");
        doc.image(buf, x, y, { width: w || 55 });
      }
    }
  } catch (e) {
    console.log("E-Fatura PDF logo basılamadı:", e?.message);
  }
}

/**
 * Taxten örnek faturasına uygun düzen:
 * 1) SAYIN + Alıcı (sol) | Özelleştirme No, Senaryo, Fatura Tipi, Fatura No (KT), Tarih, Not, TUTAR (yazıyla), Hesap Açıklaması (sağ)
 * 2) Satıcı (biz): unvan, adres, tel, web, e-posta, vergi dairesi, TCKN/VKN, e-FATURA, ETTN
 * 3) Tablo: Sıra No, Mal Hizmet, Miktar, Birim Fiyat, İskonto Oran, İskonto Tutar, İskonto Nedeni, KDV Oranı, KDV Tutarı, Diğer Vergiler, Mal Hizmet Tutarı
 * 4) Toplamlar: Mal Hizmet Toplam, Toplam İskonto, Hesaplanan KDV, Vergiler Dahil Toplam, Ödenecek Tutar
 * 5) Footer: Ödemenin Yapılacağı IBAN, tarih, e-Belge
 */
function renderTaxtenStyleContent(doc, draft, company) {
  const pageW = 595;
  const margin = 40;
  const left = margin;
  const right = pageW - margin;
  const colRight = 320; // sağ blok (fatura bilgileri) buradan başlar

  doc.fontSize(9);

  // ---------- ALICI (SAYIN) – sol blok ----------
  doc.fontSize(10).text("SAYIN", left, 50);
  doc.fontSize(9);
  const customer = draft.customer || {};
  const aliciAd = customer.title || draft.cariAd || "Müşteri";
  doc.text(aliciAd.toUpperCase(), left, 62);
  const adresSatir = [customer.adres || customer.street, customer.district, customer.city]
    .filter(Boolean)
    .join(" ");
  if (adresSatir) doc.text(adresSatir, left, 74);
  if (customer.email) doc.text(`E-Posta: ${customer.email}`, left, doc.y + 2);
  const vergiDairesi = customer.vergiDairesi || customer.taxOffice || "";
  if (vergiDairesi) doc.text(`Vergi Dairesi: ${vergiDairesi}`, left, doc.y + 2);
  const vknTckn = customer.vknTckn || customer.identifier || "";
  if (vknTckn) doc.text(`VKN: ${vknTckn}`, left, doc.y + 2);

  // ---------- Fatura bilgileri – sağ blok ----------
  const senaryo = draft.scenario === "TEMEL" ? "TEMELFATURA" : "TICARIFATURA";
  const faturaTipi = (draft.invoiceType || draft.tip) === "IADE" ? "IADE" : "SATIS";
  let faturaNo = draft.invoiceNumber || "";
  if (!faturaNo) faturaNo = "KT- (gönderimde atanacak)";
  else if (!String(faturaNo).toUpperCase().startsWith("KT")) faturaNo = `KT ${faturaNo}`;
  const faturaTarih = draft.issueDate
    ? new Date(draft.issueDate).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", " ")
    : (draft.createdAt ? new Date(draft.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", " ") : "-");
  doc.text("Özelleştirme No: TR1.2", colRight, 50);
  doc.text(`Senaryo: ${senaryo}`, colRight, 62);
  doc.text(`Fatura Tipi: ${faturaTipi}`, colRight, 74);
  doc.text(`Fatura No: ${faturaNo}`, colRight, 86);
  doc.text(`Fatura Tarihi: ${faturaTarih}`, colRight, 98);
  if (draft.notes || draft.not) {
    const notMetin = (draft.notes || draft.not || "").slice(0, 120);
    doc.text(`Not: ${notMetin}`, colRight, 110, { width: right - colRight - 5 });
  }
  const genelToplam = Number(draft.totals?.total ?? 0);
  const tutarYaziliMetin = tutarYazili(genelToplam);
  doc.fontSize(9).text(`TUTAR: ${tutarYaziliMetin.toUpperCase()}`, colRight, doc.y + 8, { width: right - colRight - 5 });
  doc.text("Hesap Açıklaması:", colRight, doc.y + 2);

  // ---------- SATICI (bizim firma) ----------
  const firmaAdi = company?.firmaAdi || company?.title || company?.companyTitle || "Firma";
  const saticiY = Math.max(doc.y + 14, 140);
  doc.text(firmaAdi.toUpperCase(), left, saticiY);
  const sAdres = [company?.adres || company?.street, company?.buildingNumber, company?.district, company?.city].filter(Boolean).join(" ");
  if (sAdres) doc.text(sAdres, left, doc.y + 2);
  if (company?.phone) doc.text(`Tel: ${company.phone}`, left, doc.y + 2);
  if (company?.website) doc.text(`Web Sitesi: ${company.website}`, left, doc.y + 2);
  if (company?.email) doc.text(`E-Posta: ${company.email}`, left, doc.y + 2);
  const sVergiDairesi = company?.vergiDairesi || company?.taxOffice || "";
  if (sVergiDairesi) doc.text(`Vergi Dairesi: ${sVergiDairesi}`, left, doc.y + 2);
  const sVkn = company?.vergiNo || company?.vkn || company?.vknTckn || "";
  if (sVkn) doc.text(`TCKN: ${sVkn}`, left, doc.y + 2);
  doc.text("e-FATURA", right - 55, saticiY, { width: 50, align: "right" });
  const ettn = draft.uuid || draft.taxtenEttn || "";
  if (ettn) doc.fontSize(8).text(`ETTN: ${ettn}`, right - 55, doc.y + 2, { width: 50, align: "right" });

  // ---------- TABLO BAŞLIKLARI ----------
  const tableTop = doc.y + 16;
  const f = 8;
  doc.fontSize(f);
  const col = {
    sira: left,
    mal: left + 22,
    miktar: left + 95,
    birimFiyat: left + 130,
    iskontoOran: left + 175,
    iskontoTutar: left + 210,
    iskontoNeden: left + 250,
    kdvOran: left + 285,
    kdvTutar: left + 315,
    digerVergi: left + 355,
    malTutar: left + 395,
  };
  doc.text("Sıra No", col.sira, tableTop);
  doc.text("Mal Hizmet", col.mal, tableTop);
  doc.text("Miktar", col.miktar, tableTop);
  doc.text("Birim Fiyat", col.birimFiyat, tableTop);
  doc.text("İskonto/Oran", col.iskontoOran, tableTop);
  doc.text("İskonto Tutar", col.iskontoTutar, tableTop);
  doc.text("Neden", col.iskontoNeden, tableTop);
  doc.text("KDV %", col.kdvOran, tableTop);
  doc.text("KDV Tutarı", col.kdvTutar, tableTop);
  doc.text("Diğer V.", col.digerVergi, tableTop);
  doc.text("Mal Hizmet Tutarı", col.malTutar, tableTop);
  doc.moveTo(left, tableTop + 2).lineTo(right, tableTop + 2).stroke();

  const items = Array.isArray(draft.items) ? draft.items : [];
  let malHizmetToplam = 0;
  let toplamIskonto = 0;
  let hesaplananKdv = 0;
  let rowY = tableTop + 10;

  items.forEach((k, idx) => {
    const name = (k.name ?? k.urunAd ?? "-").slice(0, 18);
    const quantity = Number(k.quantity ?? k.miktar ?? 0);
    const birim = k.birim || "Adet";
    const unitPrice = Number(k.price ?? k.birimFiyat ?? 0);
    const iskontoOran = Number(k.iskonto ?? k.iskontoOrani ?? 0);
    let lineNet = quantity * unitPrice;
    const satirIskontoTutar = (lineNet * iskontoOran) / 100;
    lineNet -= satirIskontoTutar;
    const kdvOran = Number(k.kdvOran ?? 20);
    const kdvTutar = (lineNet * kdvOran) / 100;
    const malHizmetTutar = lineNet;

    malHizmetToplam += lineNet + satirIskontoTutar;
    toplamIskonto += satirIskontoTutar;
    hesaplananKdv += kdvTutar;

    doc.text(String(idx + 1), col.sira, rowY);
    doc.text(name, col.mal, rowY, { width: 70 });
    doc.text(`${quantity} ${birim}`, col.miktar, rowY, { width: 32 });
    doc.text(`${unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, col.birimFiyat, rowY, { width: 42 });
    doc.text(`%${iskontoOran.toFixed(2)}`, col.iskontoOran, rowY, { width: 32 });
    doc.text(`${satirIskontoTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, col.iskontoTutar, rowY, { width: 38 });
    doc.text("-", col.iskontoNeden, rowY, { width: 32 });
    doc.text(`%${kdvOran.toFixed(2)}`, col.kdvOran, rowY, { width: 28 });
    doc.text(`${kdvTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, col.kdvTutar, rowY, { width: 38 });
    doc.text("-", col.digerVergi, rowY, { width: 38 });
    doc.text(`${malHizmetTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, col.malTutar, rowY, { width: 80 });
    rowY += 14;
  });

  // Genel iskonto (fatura bazlı)
  const genelIskontoTutar = Number(draft.genelIskontoTutar ?? 0);
  toplamIskonto += genelIskontoTutar;
  const malHizmetNet = malHizmetToplam - toplamIskonto;
  const vergilerDahilToplam = draft.totals?.total != null ? Number(draft.totals.total) : malHizmetNet + hesaplananKdv;
  const odenecekTutar = vergilerDahilToplam;

  // ---------- TOPLAM SATIRLARI (Taxten: Mal Hizmet Toplam, Toplam İskonto, KDV, Vergiler Dahil, Ödenecek) ----------
  const totalsY = rowY + 12;
  doc.fontSize(9);
  doc.text("Mal Hizmet Toplam Tutarı", left, totalsY);
  doc.text(`${malHizmetNet.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, right - 85, totalsY, { width: 80, align: "right" });
  doc.text("Toplam İskonto", left, totalsY + 12);
  doc.text(`${toplamIskonto.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, right - 85, totalsY + 12, { width: 80, align: "right" });
  doc.text("Hesaplanan KDV", left, totalsY + 24);
  doc.text(`${hesaplananKdv.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, right - 85, totalsY + 24, { width: 80, align: "right" });
  doc.text("Vergiler Dahil Toplam Tutar", left, totalsY + 36);
  doc.text(`${vergilerDahilToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, right - 85, totalsY + 36, { width: 80, align: "right" });
  doc.fontSize(10).text("Ödenecek Tutar", left, totalsY + 50);
  doc.text(`${odenecekTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, right - 85, totalsY + 50, { width: 80, align: "right" });

  // ---------- FOOTER ----------
  const footerY = Math.min(totalsY + 72, 800);
  doc.fontSize(8);
  if (company?.iban) doc.text(`Ödemenin Yapılacağı IBAN: ${company.iban}`, left, footerY);
  doc.text(`${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`, left, doc.y + 4);
  doc.text("e-Belge", right - 40, footerY, { align: "right" });
}

/** İmza data URL ise PDF altına basar */
async function drawImza(doc, imza, y) {
  if (!doc || !imza || typeof imza !== "string") return;
  const src = imza.trim();
  try {
    if (src.startsWith("data:image") && src.includes("base64,")) {
      const base64 = src.split("base64,")[1];
      if (base64) {
        const buf = Buffer.from(base64, "base64");
        doc.image(buf, 40, y, { width: 80, height: 35 });
      }
    }
  } catch (e) {
    console.log("E-Fatura PDF imza basılamadı:", e?.message);
  }
}

/**
 * E-Fatura taslağı için PDF buffer – Taxten örnek faturasına uygun düzen.
 * @param {Object} draft - Taslak (customer, items, totals, notes, invoiceNumber, scenario, uuid, ...)
 * @param {Object} [company] - Firma (firmaAdi, adres, phone, email, vergiDairesi, vergiNo, logo, imza, iban)
 * @returns {Promise<Buffer>}
 */
export async function buildDraftPdfBuffer(draft, company = null) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 36, left: 40, right: 40, bottom: 40 } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    (async () => {
      try {
        registerRoboto(doc);
        const hasLogo = company?.logo && String(company.logo).startsWith("data:image");
        if (hasLogo) {
          await drawLogo(doc, company.logo, 40, 40, 50);
        }
        renderTaxtenStyleContent(doc, draft, company || {});
        if (company?.imza && String(company.imza).startsWith("data:image")) {
          const y = Math.min(doc.y + 20, 750);
          doc.fontSize(8).text("Yetkili imzası", 40, y);
          await drawImza(doc, company.imza, y + 10);
        }
        doc.end();
      } catch (err) {
        reject(err);
      }
    })();
  });
}
