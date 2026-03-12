// 📁 /lib/marketplaces/trendyolConfig.js
// Güncel Trendyol API (developers.trendyol.com) — 7 Temmuz 2025 sonrası geçerli yeni endpoint'ler.
// Kaynak: https://developers.trendyol.com/docs/getting-started ve "3. Canlı-Test Ortam Bilgileri"
// Canlı: https://apigw.trendyol.com/integration
// Test (Stage): https://stageapigw.trendyol.com/integration

const TRENDYOL_BASE_PROD = "https://apigw.trendyol.com/integration";
const TRENDYOL_BASE_STAGE = "https://stageapigw.trendyol.com/integration";

function getTrendyolBase() {
  const url = process.env.TRENDYOL_BASE_URL;
  if (url) return url.replace(/\/$/, "");
  // Production'da canlı, aksi halde stage (TRENDYOL_USE_STAGE=1 ile prod'da da stage kullanılabilir)
  return process.env.NODE_ENV === "production" && !process.env.TRENDYOL_USE_STAGE
    ? TRENDYOL_BASE_PROD
    : TRENDYOL_BASE_STAGE;
}

/** Sipariş listesi: GET /order/sellers/{sellerId}/orders */
function ordersListUrl(sellerId) {
  return `${getTrendyolBase()}/order/sellers/${sellerId}/orders`;
}

/** Tek sipariş (orderNumber ile): GET /order/sellers/{sellerId}/orders?orderNumber= */
function orderDetailUrl(sellerId, orderNumber) {
  return `${getTrendyolBase()}/order/sellers/${sellerId}/orders?orderNumber=${encodeURIComponent(orderNumber)}`;
}

/** Kargo bildirimi: POST /order/sellers/{sellerId}/shipment-packages */
function shipmentPackagesUrl(sellerId) {
  return `${getTrendyolBase()}/order/sellers/${sellerId}/shipment-packages`;
}

/** Ürün oluşturma (eski v1 — Ağustos 2026'ya kadar destek): POST /product/sellers/{sellerId}/products */
function productCreateUrl(sellerId) {
  return `${getTrendyolBase()}/product/sellers/${sellerId}/products`;
}

/** Ürün oluşturma v2 (content-based, önerilen): POST /product/sellers/{sellerId}/v2/products */
function productCreateV2Url(sellerId) {
  return `${getTrendyolBase()}/product/sellers/${sellerId}/v2/products`;
}

/** Ürün listesi: GET /product/sellers/{sellerId}/products */
function productListUrl(sellerId) {
  return `${getTrendyolBase()}/product/sellers/${sellerId}/products`;
}

/** Kategori attribute (eski): GET /product/product-categories/{categoryId}/attributes */
function categoryAttributesUrl(categoryId) {
  return `${getTrendyolBase()}/product/product-categories/${categoryId}/attributes`;
}

/** Kategori ağacı: GET /product/product-categories — developers.trendyol.com */
function categoryTreeUrl() {
  return `${getTrendyolBase()}/product/product-categories`;
}

/** Kategori özellikleri v2: GET /product/categories/{categoryId}/attributes */
function categoryAttributesV2Url(categoryId) {
  return `${getTrendyolBase()}/product/categories/${categoryId}/attributes`;
}

/** Kategori özellik değerleri v2: GET /product/categories/{categoryId}/attributes/{attributeId}/values */
function categoryAttributeValuesUrl(categoryId, attributeId) {
  return `${getTrendyolBase()}/product/categories/${categoryId}/attributes/${attributeId}/values`;
}

/** Marka listesi: GET /product/brands */
function brandsUrl() {
  return `${getTrendyolBase()}/product/brands`;
}

/** Fiyat/stok güncelleme: POST /inventory/sellers/{sellerId}/products/price-and-inventory */
function priceAndInventoryUrl(sellerId) {
  return `${getTrendyolBase()}/inventory/sellers/${sellerId}/products/price-and-inventory`;
}

/** Test siparişi (Stage TR): POST /test/order/orders/core — sadece stageapigw */
function testOrderCoreUrl() {
  const base = process.env.TRENDYOL_BASE_URL || TRENDYOL_BASE_STAGE;
  return `${base.replace(/\/$/, "")}/test/order/orders/core`;
}

/** Webhook oluştur: POST /webhook/sellers/{sellerId}/webhooks */
function webhooksUrl(sellerId) {
  return `${getTrendyolBase()}/webhook/sellers/${sellerId}/webhooks`;
}

export {
  getTrendyolBase,
  ordersListUrl,
  orderDetailUrl,
  shipmentPackagesUrl,
  productCreateUrl,
  productCreateV2Url,
  productListUrl,
  categoryAttributesUrl,
  categoryTreeUrl,
  categoryAttributesV2Url,
  categoryAttributeValuesUrl,
  brandsUrl,
  priceAndInventoryUrl,
  testOrderCoreUrl,
  webhooksUrl,
  TRENDYOL_BASE_PROD,
  TRENDYOL_BASE_STAGE,
};
