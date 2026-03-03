/**
 * Barkodsuz ürünler için dahili (internal) EAN-13 uyumlu barkod üretir.
 * 8 ile başlayan 13 hane (iç kullanım için yaygın); son hane check digit.
 */
function ean13CheckDigit(digits12) {
  const s = String(digits12);
  if (s.length !== 12) return "";
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(s[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return String(check);
}

/**
 * Benzersiz, EAN-13 formatında 13 haneli barkod üretir (8 + 11 hane + check digit).
 * Zaman damgası + rastgele sayı ile çakışma ihtimali düşüktür.
 */
export function generateInternalBarcode() {
  const t = Date.now().toString(10).slice(-8);
  const r = Math.floor(Math.random() * 1e3)
    .toString(10)
    .padStart(3, "0");
  const digits12 = "8" + t + r;
  return digits12 + ean13CheckDigit(digits12);
}
