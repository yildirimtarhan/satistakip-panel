/**
 * PTT AVM API yapılandırması
 * Dokümantasyon: https://developers.pttavm.com/
 * Yeni entegrasyon: REST API (Api-Key + access-token) — tedarikci.pttavm.com → API BİLGİLERİM & ENTEGRATÖR FİRMALARIM
 */

/** REST API (ürün ekleme/güncelleme, sipariş, fatura vb.) */
export const PTTAVM_REST_BASE =
  process.env.PTTAVM_REST_BASE || "https://integration-api.pttavm.com/api/v1";

/** Ürün ekleme/güncelleme endpoint */
export const PTTAVM_PRODUCTS_UPSERT = `${PTTAVM_REST_BASE}/products/upsert`.replace(/\/+/g, "/");

/** Barkod ile ürün bilgisi (POST, body: { barcodes: string[] }) */
export const PTTAVM_PRODUCTS_GET_BY_BARCODES = `${PTTAVM_REST_BASE}/products/get-by-barcodes`.replace(/\/+/g, "/");

/** Hatalı ürün görselleri (POST, body: productBarcodes? veya paginationParameters?) */
export const PTTAVM_PRODUCTS_GET_FAULTY_IMAGES = `${PTTAVM_REST_BASE}/products/get-faulty-images`.replace(/\/+/g, "/");

/** Stok kontrol / ürün arama (GET, query: categoryId, subCategoryId, isActive, isInStock, merchantCategoryId, searchPage) */
export const PTTAVM_PRODUCTS_SEARCH = `${PTTAVM_REST_BASE}/products/search`.replace(/\/+/g, "/");

/** Fiyat/stok güncelle (POST, body: { items: [{ barcode, quantity?, priceWithoutVAT?, priceWithVAT?, vatRate?, active?, discount?, variants?, isCargoFromSupplier? }] }) */
export const PTTAVM_PRODUCTS_STOCK_PRICES = `${PTTAVM_REST_BASE}/products/stock-prices`.replace(/\/+/g, "/");

/** Ana kategori listesi (POST) */
export const PTTAVM_CATEGORIES_MAIN = `${PTTAVM_REST_BASE}/categories/main`.replace(/\/+/g, "/");

/** Kategori ağacı (POST, body: parent_id?, last_update?) */
export const PTTAVM_CATEGORIES_TREE = `${PTTAVM_REST_BASE}/categories/category-tree`.replace(/\/+/g, "/");

/** Kargo profil listesi (GET) – Sipariş entegrasyonu */
export const PTTAVM_SHIPPING_CARGO_PROFILES = `${PTTAVM_REST_BASE}/shipping/cargo-profiles`.replace(/\/+/g, "/");

/** Sipariş detay (GET) – orders/{orderId} */
export const PTTAVM_ORDERS_BASE = `${PTTAVM_REST_BASE}/orders`.replace(/\/+/g, "/");

/** Sipariş arama / kontrol V2 (GET) – orders/search?startDate=&endDate=&isActiveOrders= */
export const PTTAVM_ORDERS_SEARCH = `${PTTAVM_REST_BASE}/orders/search`.replace(/\/+/g, "/");

/** Kargo API (farklı base – Basic Auth) */
export const PTTAVM_SHIPMENT_BASE =
  process.env.PTTAVM_SHIPMENT_BASE || "https://shipment.pttavm.com/api/v1";
export const PTTAVM_SHIPMENT_GET_WAREHOUSE = `${PTTAVM_SHIPMENT_BASE}/get-warehouse`.replace(/\/+/g, "/");
export const PTTAVM_SHIPMENT_CREATE_BARCODE = `${PTTAVM_SHIPMENT_BASE}/create-barcode`.replace(/\/+/g, "/");
export const PTTAVM_SHIPMENT_BARCODE_STATUS = `${PTTAVM_SHIPMENT_BASE}/barcode-status`.replace(/\/+/g, "/");
export const PTTAVM_SHIPMENT_GET_BARCODE_TAG = `${PTTAVM_SHIPMENT_BASE}/get-barcode-tag`.replace(/\/+/g, "/");
export const PTTAVM_SHIPMENT_UPDATE_NO_SHIPPING_ORDER = `${PTTAVM_SHIPMENT_BASE}/update-no-shipping-order`.replace(/\/+/g, "/");
