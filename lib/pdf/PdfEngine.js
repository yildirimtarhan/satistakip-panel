import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/* ---------------- helpers ---------------- */

function findRes(args) {
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
  const last = args[args.length - 1];
  if (last && typeof last === "object" && last !== res && typeof last.setHeader !== "function") {
    return last;
  }
  if (args.length >= 2 && args[0] === res && typeof args[1] === "object") return args[1];
  return {};
}

function stripControlChars(s) {
  return String(s || "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
}

function safeAsciiFilename(input) {
  let s = stripControlChars(input || "dokuman");
  s = s
    .replace(/ğ/g, "g").replace(/Ğ/g, "G")
    .replace(/ü/g, "u").replace(/Ü/g, "U")
    .replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .replace(/ö/g, "o").replace(/Ö/g, "O")
    .replace(/ç/g, "c").replace(/Ç/g, "C");
  s = s.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return s || "dokuman";
}

function buildContentDisposition(title, inline = true) {
  const fallback = safeAsciiFilename(title) + ".pdf";
  const utf8Name = stripControlChars(title || "dokuman") + ".pdf";
  const encoded = encodeURIComponent(utf8Name);
  const type = inline ? "inline" : "attachment";
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/* ---------------- LOGO (URL destekli) ---------------- */

// ✅ Cloudinary / URL resimlerini buffer olarak indirir (Node 18+ fetch var)
async function fetchImageBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Logo indirilemedi: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * ✅ PDF'e logo basar
 * - Local path ise direkt basar
 * - URL ise indirip buffer olarak basar (Cloudinary destek)
 * - Hata olursa PDF bozulmaz
 */
export async function drawLogo(doc, logo, x, y, width = 65) {
  if (!doc || !logo) return;

  try {
    const src = String(logo);

    if (src.startsWith("http://") || src.startsWith("https://")) {
      const buffer = await fetchImageBuffer(src);
      doc.image(buffer, x, y, { width });
      return;
    }

    // local path
    doc.image(src, x, y, { width });
  } catch (err) {
    console.log("Logo basılamadı:", err?.message || err);
  }
}

/* ---------------- FONT ---------------- */

function resolveFont(filename) {
  const candidates = [
    path.join(process.cwd(), "public/fonts", filename),
    path.join(process.cwd(), "lib/pdf/fonts", filename),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function registerRoboto(doc, withBold = false) {
  const regular = resolveFont("Roboto-Regular.ttf");
  if (!regular) {
    throw new Error("Roboto-Regular.ttf bulunamadı");
  }
  doc.registerFont("Roboto", regular);
  if (withBold) {
    const bold = resolveFont("Roboto-Bold.ttf");
    if (bold) doc.registerFont("Roboto-Bold", bold);
    doc._robotoBold = !!bold;
  }
  doc._robotoFont = true;
  doc.font("Roboto");
}

/* ---------------- ENGINE ---------------- */

export function createPdf(...args) {
  const res = findRes(args);
  if (!res) {
    throw new Error("PdfEngine.createPdf: res bulunamadı");
  }

  const options = findOptions(args, res);
  const {
    title = "SatışTakip ERP",
    inline = true,
    fileName,
    size = "A4",
    layout = "portrait",
    margins = { top: 40, left: 40, right: 40, bottom: 50 },
  } = options || {};

  const finalSize = layout === "landscape" ? [842, 595] : size;

  const doc = new PDFDocument({
    size: finalSize,
    layout,
    margins,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Disposition", buildContentDisposition(fileName || title, inline));

  // 🔥 ÖNCE FONT
  registerRoboto(doc);

  // 🔥 SONRA PIPE
  doc.pipe(res);

  doc.on("end", () => {
    try {
      res.end();
    } catch (_) {}
  });

  return doc;
}

/**
 * Buffer modunda PDF oluşturur – res (response) olmadan kullanım için.
 * E-Fatura, rapor vb. senaryolarda kullanılır.
 * @param {Object} [options] - { size, layout, margins, withBold }
 * @returns {{ doc: PDFKitDocument, getBuffer: () => Promise<Buffer> }}
 */
export function createPdfAsBuffer(options = {}) {
  const {
    size = "A4",
    layout = "portrait",
    margins = { top: 40, left: 40, right: 40, bottom: 50 },
    withBold = true,
  } = options;

  const doc = new PDFDocument({
    size: layout === "landscape" ? [842, 595] : size,
    layout,
    margins,
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const bufferPromise = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  registerRoboto(doc, withBold);

  return {
    doc,
    getBuffer: () => {
      doc.end();
      return bufferPromise;
    },
  };
}
