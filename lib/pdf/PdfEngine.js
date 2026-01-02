// /lib/pdf/PdfEngine.js  ✅ FINAL (kökten düzeltme)
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * Merkezi PDF Motoru (PDFKit)
 * - createPdf(res, options) veya createPdf(req, res, options) çalışır
 * - Content-Disposition güvenli (ERR_INVALID_CHAR çözülür)
 * - Roboto Regular/Bold otomatik register (ENOENT Roboto-Bold çözülür)
 */

function findRes(args) {
  // res objesi: setHeader/status/end fonksiyonları olan
  for (const a of args) {
    if (
      a &&
      typeof a === "object" &&
      typeof a.setHeader === "function" &&
      typeof a.status === "function" &&
      typeof a.end === "function"
    ) {
      return a;
    }
  }
  return null;
}

function findOptions(args, res) {
  // options genelde son parametre
  const last = args[args.length - 1];
  if (last && typeof last === "object" && last !== res && typeof last.setHeader !== "function") {
    return last;
  }
  // createPdf(res, options) ise 2. parametre options
  if (args.length >= 2 && args[0] === res && args[1] && typeof args[1] === "object") return args[1];
  return {};
}

function stripControlChars(s) {
  return String(s || "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, "") // kontrol karakterleri
    .trim();
}

function safeAsciiFilename(input) {
  // header için güvenli ASCII filename üret
  let s = stripControlChars(input || "dokuman");
  // Türkçe karakterleri sadeleştir
  s = s
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C");
  // sadece güvenli karakterler
  s = s.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  if (!s) s = "dokuman";
  return s;
}

function buildContentDisposition(title, inline = true) {
  // RFC5987 filename* ile UTF-8 destekli + ASCII fallback
  const fallback = safeAsciiFilename(title) + ".pdf";
  const utf8Name = stripControlChars(title || "dokuman") + ".pdf";
  const encoded = encodeURIComponent(utf8Name);
  const type = inline ? "inline" : "attachment";
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function resolveFontFile(filename) {
  // Öncelik sırası: ENV -> /public/fonts -> /lib/pdf/fonts -> proje kökü
  const candidates = [];

  const envDir = process.env.PDF_FONT_DIR;
  if (envDir) candidates.push(path.join(envDir, filename));

  candidates.push(path.join(process.cwd(), "public", "fonts", filename));
  candidates.push(path.join(process.cwd(), "lib", "pdf", "fonts", filename));
  candidates.push(path.join(process.cwd(), filename));

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function registerRoboto(doc) {
  // Roboto-Regular.ttf ve Roboto-Bold.ttf varsa register et
  const regular = resolveFontFile("Roboto-Regular.ttf");
  const bold = resolveFontFile("Roboto-Bold.ttf");

  if (regular) doc.registerFont("Roboto-Regular", regular);
  if (bold) doc.registerFont("Roboto-Bold", bold);

  // Default font
  if (regular) doc.font("Roboto-Regular");
  else doc.font("Helvetica");

  return { regularFound: !!regular, boldFound: !!bold };
}

function drawHeader(doc, { title, subtitle }) {
  // Basit header (mevcut template’ler zaten kendi çiziyorsa sorun etmez)
  doc
    .fontSize(14)
    .text(title || "SatışTakip ERP", { align: "center" });

  if (subtitle) {
    doc.moveDown(0.2);
    doc.fontSize(10).text(subtitle, { align: "center" });
  }

  doc.moveDown(0.5);
}

function drawFooter(doc) {
  doc.moveDown(1);
  doc
    .fontSize(8)
    .fillColor("gray")
    .text(`Oluşturulma: ${new Date().toLocaleString("tr-TR")}`, { align: "center" })
    .fillColor("black");
}

/**
 * ✅ createPdf(res, options)
 * ✅ createPdf(req, res, options)
 *
 * options:
 *  - title, subtitle
 *  - inline (default true)
 *  - fileName (opsiyonel)
 *  - size (default A4)
 *  - margins
 */
export function createPdf(...args) {
  const res = findRes(args);
  if (!res) {
    // Bu hata eski çağrılar yüzünden oluyordu; artık net hata veriyoruz
    throw new Error("PdfEngine.createPdf: 'res' bulunamadı. createPdf(req,res,opts) veya createPdf(res,opts) çağırın.");
  }

  const options = findOptions(args, res);
  const {
    title = "SatışTakip ERP",
    subtitle = "",
    inline = true,
    fileName, // opsiyonel
    size = "A4",
    margins = { top: 40, left: 40, right: 40, bottom: 50 },
  } = options || {};

  const safeTitle = stripControlChars(title);
  const doc = new PDFDocument({ size, margins });

  // Header’lar (kritik: invalid char fix)
  const headerTitle = fileName || safeTitle || "dokuman";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Disposition", buildContentDisposition(headerTitle, inline));

  // Pipe
  doc.pipe(res);

  // Font register (kritik: Roboto-Bold ENOENT fix)
  registerRoboto(doc);

  // Sayfa başı header çiz (template isterse üzerine yazar)
  drawHeader(doc, { title: safeTitle, subtitle });

  // doc.end override: footer ekleyip kapat
  const originalEnd = doc.end.bind(doc);
  doc.end = () => {
    try {
      drawFooter(doc);
    } catch (_) {}
    originalEnd();
  };

  return doc;
}

/**
 * İstersen route içinde try/catch’te kullan:
 * res.headersSent kontrolü
 */
export function sendPdfError(res, err, publicMessage = "PDF oluşturulamadı") {
  try {
    // eslint-disable-next-line no-console
    console.error("PDF ERROR:", err);
    if (res && !res.headersSent) {
      res.status(500).json({ message: publicMessage });
    } else if (res && !res.writableEnded) {
      res.end(publicMessage);
    }
  } catch (_) {}
}
