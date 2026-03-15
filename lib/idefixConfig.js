/**
 * İdefix API yapılandırması
 * Dokümantasyon: https://developer.idefix.com/ — Canlı / Test Ortam Bilgileri
 * Auth: X-API-KEY = base64(ApiKey:ApiSecret)
 *
 * TEST: IP yetkilendirmesi gerekir. Test hesapları İdefix tarafından tanımlanıp paylaşılır.
 * CANLI: IP kısıtı yok. API KEY / SECRET / Satıcı ID prod ve stage için farklıdır.
 *
 * TEST PIM:  https://ide-pimapi.idefiks.net/api/connector/product-category
 * TEST OMS:  https://ide-omsapi.idefiks.net/api/shipment/connect/{vendorID}/claim-list
 * CANLI PIM: https://merchantapi.idefix.com/pim/product-category
 * CANLI OMS: https://merchantapi.idefix.com/oms/{vendorId}list  (dokümanda slash yok; kodda /{vendorId}/list kullanılıyor)
 */

/** Test (stage) – IP yetkilendirmesi gerekir */
export const IDEFIX_PIM_TEST = process.env.IDEFIX_PIM_TEST || "https://ide-pimapi.idefiks.net";
export const IDEFIX_OMS_TEST = process.env.IDEFIX_OMS_TEST || "https://ide-omsapi.idefiks.net";

/** Canlı (prod) */
export const IDEFIX_PIM_PROD = process.env.IDEFIX_PIM_PROD || "https://merchantapi.idefix.com/pim";
export const IDEFIX_OMS_PROD = process.env.IDEFIX_OMS_PROD || "https://merchantapi.idefix.com/oms";
