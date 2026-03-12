/**
 * Hepsiburada test/prod ortamı için env okuma.
 * Hem HEPSIBURADA_* hem HB_* isimleri desteklenir.
 *
 * Örnek .env (canlı):
 *   HEPSIBURADA_MERCHANT_ID=b95f26b8-d9ba-49a6-b148-54ea2405c3bc
 *   HEPSIBURADA_SECRET_KEY=prjZRKtY3wP3
 *   HEPSIBURADA_AUTH=Yjk1ZjI2YjgtZDliYS00OWE2LWIxNDgtNTRlYTI0MDVjM2JjOnByalpSS3RZM3dQMw==
 *   HEPSIBURADA_USER_AGENT=satistakiponline_dev
 *   HEPSIBURADA_BASE_URL=https://oms-external.hepsiburada.com
 *   HEPSIBURADA_OMS_BASE_URL=https://oms-external.hepsiburada.com
 *   HB_WEBHOOK_USERNAME=mywebhook
 *   HB_WEBHOOK_PASSWORD=supersecret123
 *
 * Örnek .env (test):
 *   HEPSIBURADA_BASE_URL=https://mpop-sit.hepsiburada.com
 *   HEPSIBURADA_OMS_BASE_URL=https://oms-external-sit.hepsiburada.com
 */

export function getHepsiburadaMerchantId() {
  return process.env.HEPSIBURADA_MERCHANT_ID || process.env.HB_MERCHANT_ID || "";
}

/** Hepsiburada API çağrıları için Basic Authorization header değeri (örn. "Basic xyz...") */
export function getHepsiburadaAuth() {
  const auth = process.env.HEPSIBURADA_AUTH;
  if (auth) return `Basic ${auth.replace(/^Basic\s+/i, "")}`;
  const merchantId = getHepsiburadaMerchantId();
  const secret =
    process.env.HEPSIBURADA_SECRET_KEY ||
    process.env.HB_SECRET_KEY ||
    process.env.HB_PASSWORD ||
    "";
  if (merchantId && secret)
    return `Basic ${Buffer.from(`${merchantId}:${secret}`).toString("base64")}`;
  return null;
}

export function getHepsiburadaUserAgent() {
  return (
    process.env.HEPSIBURADA_USER_AGENT ||
    process.env.HB_USER_AGENT ||
    "satistakiponline_dev"
  );
}

/** MPOP / katalog / ürün API için base URL */
export function getHepsiburadaBaseUrl() {
  return (
    process.env.HEPSIBURADA_BASE_URL ||
    process.env.HB_BASE_URL ||
    "https://mpop.hepsiburada.com"
  );
}

/** Katalog / products-by-merchant-and-status için MPOP base (OMS değil) */
export function getHepsiburadaMpopBaseUrl() {
  const mpop = process.env.HEPSIBURADA_MPOP_BASE_URL || process.env.HEPSIBURADA_CATALOG_BASE_URL;
  const base = process.env.HEPSIBURADA_BASE_URL || process.env.HB_BASE_URL;
  const isOmsOnly = base && base.includes("oms-external");
  return (
    mpop ||
    (isOmsOnly ? "https://mpop.hepsiburada.com" : null) ||
    base ||
    "https://mpop.hepsiburada.com"
  );
}

/** OMS (sipariş) API için base URL - webhook ve sipariş detayı için */
export function getHepsiburadaOmsBaseUrl() {
  const url =
    process.env.HEPSIBURADA_OMS_BASE_URL ||
    process.env.HEPSIBURADA_BASE_URL ||
    process.env.HB_OMS_BASE_URL ||
    "https://oms-external.hepsiburada.com";
  return url.replace(/\/$/, "");
}

/** Test ortamında mı (sit URL kullanılıyor) - stub fallback sadece testte */
export function isHepsiburadaTestMode() {
  const oms = getHepsiburadaOmsBaseUrl();
  return oms.includes("-sit.") || oms.includes("-sit");
}

/** Webhook'ta Hepsiburada'dan gelen isteği doğrulamak için (HB_WEBHOOK_* kullanılır) */
export function getWebhookCredentials() {
  return {
    username: process.env.HB_WEBHOOK_USERNAME || "",
    password: process.env.HB_WEBHOOK_PASSWORD || "",
  };
}
