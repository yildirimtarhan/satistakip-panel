/**
 * Pazarama İş Ortağım API yapılandırması
 * Dokümantasyon: https://isortagim.pazarama.com/auth/integration
 * baseurl = isortagimapi.pazarama.com (order, refund, delivery /api/ kullanmaz)
 */

export const PAZARAMA_AUTH_URL = "https://isortagimgiris.pazarama.com/connect/token";
export const PAZARAMA_API_BASE = "https://isortagimapi.pazarama.com/api/";
export const PAZARAMA_BASE = "https://isortagimapi.pazarama.com/";
export const PAZARAMA_SCOPE = "merchantgatewayapi.fullaccess";

/** Servis limitleri (dokümantasyon) */
export const PAZARAMA_RATE_LIMIT_MS = 10000; // 10 sn - stok/fiyat ve ürün ekleme arası
export const PAZARAMA_STOCK_BATCH_SIZE = 3000; // Stok-fiyat: max 3000 ürün/istek
export const PAZARAMA_PRODUCT_BATCH_SIZE = 500; // Ürün ekleme: max 500 ürün/istek
