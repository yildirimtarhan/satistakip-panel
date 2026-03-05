/**
 * Türkiye e-fatura / GIB’de kullanılan KDV oranları.
 * Tüm oranlar tek yerde; fatura, ürün ve diğer ekranlarda seçenekli kullanılır.
 */
export const E_FATURA_KDV_ORANLARI = [0, 1, 8, 10, 18, 20];

/** Varsayılan KDV oranı (genel satış) */
export const DEFAULT_KDV_ORANI = 20;

/**
 * Verilen oran listede varsa döndürür, yoksa varsayılan oranı döndürür.
 * @param {number} oran
 * @returns {number}
 */
export function gecerliKdvOrani(oran) {
  const n = Number(oran);
  if (Number.isFinite(n) && E_FATURA_KDV_ORANLARI.includes(n)) return n;
  return DEFAULT_KDV_ORANI;
}
