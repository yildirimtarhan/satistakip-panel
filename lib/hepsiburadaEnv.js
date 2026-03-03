/**
 * Hepsiburada test/prod ortamı için env okuma.
 * Hem HEPSIBURADA_* hem HB_* isimleri desteklenir.
 *
 * Örnek .env (test):
 *   HEPSIBURADA_MERCHANT_ID=07283889-aa00-4809-9d19-b76d97f9bebd
 *   HEPSIBURADA_AUTH=MDcyODM4ODktYWEwMC00ODA5LTlkMTktYjc2ZDk3ZjliZWJkOnR0RkU4Q3J6cEM4YQ==
 *   HEPSIBURADA_USER_AGENT=tigdes_dev
 *   HEPSIBURADA_BASE_URL=https://mpop-sit.hepsiburada.com
 *   HB_WEBHOOK_USERNAME=mywebhook
 *   HB_WEBHOOK_PASSWORD=supersecret123
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
    "tigdes_dev"
  );
}

export function getHepsiburadaBaseUrl() {
  return (
    process.env.HEPSIBURADA_BASE_URL ||
    "https://mpop-sit.hepsiburada.com"
  );
}

/** Webhook'ta Hepsiburada'dan gelen isteği doğrulamak için (HB_WEBHOOK_* kullanılır) */
export function getWebhookCredentials() {
  return {
    username: process.env.HB_WEBHOOK_USERNAME || "",
    password: process.env.HB_WEBHOOK_PASSWORD || "",
  };
}
