/**
 * Hepsiburada API base URL'leri — Finance, Soru Cevap, Shipping
 * Test: -sit; Canlı: -sit kaldırılır
 */

function isTestMode(testModeParam) {
  if (testModeParam !== undefined) return !!testModeParam;
  const oms = process.env.HEPSIBURADA_OMS_BASE_URL || process.env.HEPSIBURADA_BASE_URL || process.env.HB_OMS_BASE_URL || "";
  return oms.includes("-sit.");
}

/** Muhasebe (transactions) base — mpfinance-external */
export function getHepsiburadaFinanceBaseUrl(testMode) {
  const env = process.env.HEPSIBURADA_FINANCE_BASE_URL || process.env.HB_FINANCE_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  return isTestMode(testMode)
    ? "https://mpfinance-external-sit.hepsiburada.com"
    : "https://mpfinance-external.hepsiburada.com";
}

/** Kayıt bazlı muhasebe: GET /transactions/merchantid/{merchantId} */
export function getTransactionsUrl(merchantId, testMode) {
  return `${getHepsiburadaFinanceBaseUrl(testMode)}/transactions/merchantid/${encodeURIComponent(merchantId)}`;
}

/** Soru Cevap (Ask to Seller) base — api-asktoseller-merchant */
export function getHepsiburadaAskToSellerBaseUrl(testMode) {
  const env = process.env.HEPSIBURADA_ASKTOSELLER_BASE_URL || process.env.HB_ASKTOSELLER_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  return isTestMode(testMode)
    ? "https://api-asktoseller-merchant-sit.hepsiburada.com"
    : "https://api-asktoseller-merchant.hepsiburada.com";
}

/** Soru listesi ve cevaplama base path */
export function getQuestionsBaseUrl(testMode) {
  return `${getHepsiburadaAskToSellerBaseUrl(testMode)}/api/v1.0`;
}

/** Shipping base — cargo firmaları vb. (cargo-firms.js'te de kullanılıyor) */
export function getHepsiburadaShippingBaseUrl(testMode) {
  const env = process.env.HEPSIBURADA_SHIPPING_BASE_URL || process.env.HB_SHIPPING_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  return isTestMode(testMode)
    ? "https://shipping-external-sit.hepsiburada.com"
    : "https://shipping-external.hepsiburada.com";
}

/** OMS base — sipariş, talep, teslimat API'leri */
export function getHepsiburadaOmsBaseUrl(testMode) {
  const env = process.env.HEPSIBURADA_OMS_BASE_URL || process.env.HEPSIBURADA_BASE_URL || process.env.HB_OMS_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  return isTestMode(testMode)
    ? "https://oms-external-sit.hepsiburada.com"
    : "https://oms-external.hepsiburada.com";
}

/** Talep listesi: GET /claims/merchantId/{merchantId}/status/{status} */
export function getClaimsListUrl(merchantId, status, testMode) {
  const base = getHepsiburadaOmsBaseUrl(testMode);
  return `${base}/claims/merchantId/${encodeURIComponent(merchantId)}/status/${encodeURIComponent(status)}`;
}

/** Talep kabul: POST /claims/number/{claimNumber}/accept */
export function getClaimAcceptUrl(claimNumber, testMode) {
  const base = getHepsiburadaOmsBaseUrl(testMode);
  return `${base}/claims/number/${encodeURIComponent(claimNumber)}/accept`;
}

/** Talep red: POST /claims/number/{claimNumber}/reject */
export function getClaimRejectUrl(claimNumber, testMode) {
  const base = getHepsiburadaOmsBaseUrl(testMode);
  return `${base}/claims/number/${encodeURIComponent(claimNumber)}/reject`;
}

/** Teslimat: deliver / undeliver / intransit */
export function getPackageDeliverUrl(merchantId, packageNumber, testMode) {
  const base = getHepsiburadaOmsBaseUrl(testMode);
  return `${base}/packages/merchantid/${encodeURIComponent(merchantId)}/packagenumber/${encodeURIComponent(packageNumber)}/deliver`;
}
export function getPackageUndeliverUrl(merchantId, packageNumber, testMode) {
  const base = getHepsiburadaOmsBaseUrl(testMode);
  return `${base}/packages/merchantid/${encodeURIComponent(merchantId)}/packagenumber/${encodeURIComponent(packageNumber)}/undeliver`;
}
export function getPackageIntransitUrl(merchantId, packageNumber, testMode) {
  const base = getHepsiburadaOmsBaseUrl(testMode);
  return `${base}/packages/merchantid/${encodeURIComponent(merchantId)}/packagenumber/${encodeURIComponent(packageNumber)}/intransit`;
}
