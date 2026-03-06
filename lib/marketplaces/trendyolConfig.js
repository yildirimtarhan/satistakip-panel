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

/** Ürün oluşturma: POST /product/sellers/{sellerId}/products */
function productCreateUrl(sellerId) {
  return `${getTrendyolBase()}/product/sellers/${sellerId}/products`;
}

/** Ürün listesi: GET /product/sellers/{sellerId}/products */
function productListUrl(sellerId) {
  return `${getTrendyolBase()}/product/sellers/${sellerId}/products`;
}

/** Kategori attribute: GET /product/product-categories/{categoryId}/attributes */
function categoryAttributesUrl(categoryId) {
  return `${getTrendyolBase()}/product/product-categories/${categoryId}/attributes`;
}

/** Fiyat/stok güncelleme: POST /inventory/sellers/{sellerId}/products/price-and-inventory */
function priceAndInventoryUrl(sellerId) {
  return `${getTrendyolBase()}/inventory/sellers/${sellerId}/products/price-and-inventory`;
}

export {
  getTrendyolBase,
  ordersListUrl,
  orderDetailUrl,
  shipmentPackagesUrl,
  productCreateUrl,
  productListUrl,
  categoryAttributesUrl,
  priceAndInventoryUrl,
  TRENDYOL_BASE_PROD,
  TRENDYOL_BASE_STAGE,
};
