/**
 * E-Fatura fatura numarası – ERP (panel) tek kaynaktır; Taxten'e bu numara ile gönderilir.
 * Format: [Önek] + YY + MM + 8 haneli sıra (örn. KT260200000001)
 * @param {string} prefix - Önek (varsayılan "KT")
 * @param {number} year - Yıl (2026)
 * @param {number} month - Ay (1-12)
 * @param {number} seq - Sıra numarası (artan)
 * @returns {string}
 */
export function formatEfaturaInvoiceNo(prefix, year, month, seq) {
  const p = (prefix || "KT").toString().toUpperCase().replace(/\s/g, "");
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, "0");
  const seqStr = String(seq).padStart(8, "0");
  return `${p}${yy}${mm}${seqStr}`;
}
