/**
 * Tutarı Türk Lirası yazıyla döndürür (örn: 1.234,56 → "Bin İki Yüz Otuz Dört Türk Lirası 56 Kuruş")
 */
const BIRLER = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
const ONLAR = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
const YUZLER = ["", "Yüz", "İki Yüz", "Üç Yüz", "Dört Yüz", "Beş Yüz", "Altı Yüz", "Yedi Yüz", "Sekiz Yüz", "Dokuz Yüz"];

function uceBol(s) {
  const n = String(s).replace(/\D/g, "");
  if (!n || n === "0") return []; // forEach için her zaman dizi döndür
  const parts = [];
  let i = n.length;
  while (i > 0) {
    parts.unshift(n.slice(Math.max(0, i - 3), i));
    i -= 3;
  }
  return parts;
}

function ucluYazili(str) {
  const s = str.padStart(3, "0");
  const b = Number(s[2]);
  const o = Number(s[1]);
  const y = Number(s[0]);
  let out = YUZLER[y];
  if (y === 1 && o === 0 && b === 0) return "Yüz"; // 100
  if (o === 1) {
    out += (out ? " " : "") + (b === 0 ? "On" : ["On Bir", "On İki", "On Üç", "On Dört", "On Beş", "On Altı", "On Yedi", "On Sekiz", "On Dokuz"][b - 1]);
  } else {
    out += (out ? " " : "") + ONLAR[o] + (ONLAR[o] && BIRLER[b] ? " " : "") + BIRLER[b];
  }
  return out.trim();
}

/**
 * @param {number} tutar - Genel toplam (örn: 1234.56)
 * @returns {string} - "Bin İki Yüz Otuz Dört Türk Lirası 56 Kuruş"
 */
export function tutarYazili(tutar) {
  const n = Number(tutar);
  if (Number.isNaN(n) || n < 0) return "Geçersiz tutar";
  const tam = Math.floor(n);
  const kurus = Math.round((n - tam) * 100);

  const str = String(tam);
  const gruplar = uceBol(str);
  const birimler = ["", "Bin", "Milyon", "Milyar"];
  let yazi = "";
  gruplar.forEach((g, idx) => {
    const birim = birimler[gruplar.length - 1 - idx];
    const gNum = parseInt(g, 10);
    if (gNum === 0) return;
    if (gNum === 1 && birim === "Bin") {
      yazi += (yazi ? " " : "") + "Bin";
      return;
    }
    yazi += (yazi ? " " : "") + ucluYazili(g) + (birim ? " " + birim : "");
  });
  if (!yazi) yazi = "Sıfır";
  yazi += " Türk Lirası";
  if (kurus > 0) yazi += " " + kurus + " Kuruş";
  return yazi.trim();
}

export default tutarYazili;
