/**
 * E-Fatura taslak PDF – PdfEngine + efaturaDraft template.
 * İmza GİB damgası altında, template içinde çizilir.
 */
import { createPdfAsBuffer } from "@/lib/pdf/PdfEngine";
import { renderEfaturaDraftPdf } from "@/lib/pdf/templates/efaturaDraft";

/**
 * E-Fatura taslağı için PDF buffer
 * @param {Object} draft - Taslak (paraBirimi, customer, items, totals, ...)
 * @param {Object} [company] - Firma (gibLogo, imza, iban, ...)
 */
export async function buildDraftPdfBuffer(draft, company = null) {
  const { doc, getBuffer } = createPdfAsBuffer({
    size: "A4",
    margins: { top: 36, left: 40, right: 40, bottom: 40 },
    withBold: false,
  });

  await renderEfaturaDraftPdf(doc, draft, company || {});

  return getBuffer();
}
