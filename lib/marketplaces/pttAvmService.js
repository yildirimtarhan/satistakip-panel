/**
 * PTT AVM REST API Service
 * Dokümantasyon: https://developers.pttavm.com/
 * Ürün ekleme/güncelleme: POST /api/v1/products/upsert (Api-Key + access-token)
 */
import axios from "axios";
import {
  PTTAVM_PRODUCTS_UPSERT,
  PTTAVM_PRODUCTS_GET_BY_BARCODES,
  PTTAVM_PRODUCTS_GET_FAULTY_IMAGES,
  PTTAVM_PRODUCTS_SEARCH,
  PTTAVM_PRODUCTS_STOCK_PRICES,
  PTTAVM_CATEGORIES_MAIN,
  PTTAVM_CATEGORIES_TREE,
  PTTAVM_SHIPPING_CARGO_PROFILES,
  PTTAVM_ORDERS_BASE,
  PTTAVM_ORDERS_SEARCH,
  PTTAVM_SHIPMENT_GET_WAREHOUSE,
  PTTAVM_SHIPMENT_CREATE_BARCODE,
  PTTAVM_SHIPMENT_BARCODE_STATUS,
  PTTAVM_SHIPMENT_GET_BARCODE_TAG,
  PTTAVM_SHIPMENT_UPDATE_NO_SHIPPING_ORDER,
  PTTAVM_REST_BASE,
} from "@/lib/pttAvmConfig";
import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";

/** X-Correlation-Id için basit UUID benzeri değer */
function correlationId() {
  return "ptt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

/**
 * REST isteği için ortak header'lar
 * @param {{ apiKey: string, accessToken: string }} creds
 */
function pttAvmHeaders(creds) {
  return {
    "Content-Type": "application/json",
    "Api-Key": creds.apiKey,
    "access-token": creds.accessToken,
    "X-Correlation-Id": correlationId(),
  };
}

/** Kargo API (shipment.pttavm.com) Basic Auth header – apiKey:accessToken */
function pttAvmShipmentAuthHeader(creds) {
  const user = String(creds?.apiKey ?? "").trim();
  const pass = String(creds?.accessToken ?? "").trim();
  const encoded = Buffer.from(`${user}:${pass}`, "utf8").toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

/**
 * Bağlantı testi: boş ürün listesi ile upsert çağrısı → 400 "Boş ürün listesi" = yetki OK
 * @param {{ apiKey: string, accessToken: string }} creds
 */
export async function pttAvmTestConnection(creds) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  try {
    const res = await axios.post(
      PTTAVM_PRODUCTS_UPSERT,
      { items: [] },
      {
        headers: pttAvmHeaders(creds),
        timeout: 15000,
        validateStatus: () => true,
      }
    );
    if (res.status === 401) {
      throw new Error("Yetki hatası (401). Api-Key ve access-token doğru olmalı.");
    }
    if (res.status === 400 && res.data?.message != null) {
      const msg = String(res.data.message);
      if (/boş|empty/i.test(msg)) {
        return { success: true, message: "PTT AVM API bağlantısı başarılı." };
      }
    }
    if (res.status === 200 && res.data?.success === true) {
      return { success: true, message: "PTT AVM API bağlantısı başarılı." };
    }
    throw new Error(res.data?.message || `HTTP ${res.status}`);
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error("PTT AVM yetki hatası. Api-Key ve access-token kontrol edin (Hesap Yönetimi → Entegrasyon Bilgileri).");
    }
    throw err;
  }
}

/**
 * Ana kategori listesi (POST /api/v1/categories/main)
 * @param {{ apiKey: string, accessToken: string }} creds
 * @returns {Promise<{ success: boolean, main_category: Array<{ id: string|null, name: string|null, updated_at: string|null }>, error?: { error_code: string|null, error_message: string|null } }>}
 */
export async function pttAvmGetMainCategories(creds) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const res = await axios.post(
    PTTAVM_CATEGORIES_MAIN,
    {},
    {
      headers: pttAvmHeaders(creds),
      timeout: 15000,
    }
  );
  const data = res.data || {};
  if (data.error?.error_message && !data.success) {
    throw new Error(data.error.error_message || data.error.error_code || "Kategori listesi alınamadı.");
  }
  return data;
}

/**
 * Kategori ağacı (POST /api/v1/categories/category-tree)
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {{ parent_id?: number|string, last_update?: string }} [options] - parent_id: 0 = tüm ağaç; last_update: tarih (güncellenmiş kategoriler)
 * @returns {Promise<{ success: boolean, category_tree: Array, error?: object }>}
 */
export async function pttAvmGetCategoryTree(creds, options = {}) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const body = {};
  if (options.parent_id !== undefined && options.parent_id !== null && options.parent_id !== "") {
    body.parent_id = Number(options.parent_id);
  }
  if (options.last_update && String(options.last_update).trim()) {
    body.last_update = String(options.last_update).trim();
  }
  const res = await axios.post(
    PTTAVM_CATEGORIES_TREE,
    Object.keys(body).length ? body : {},
    {
      headers: pttAvmHeaders(creds),
      timeout: 15000,
    }
  );
  const data = res.data || {};
  if (data.error?.error_message && !data.success) {
    throw new Error(data.error.error_message || data.error.error_code || "Kategori ağacı alınamadı.");
  }
  return data;
}

/**
 * Kargo profil listesi (GET /api/v1/shipping/cargo-profiles) – Sipariş entegrasyonu
 * @param {{ apiKey: string, accessToken: string }} creds
 * @returns {Promise<{ cargoProfiles: Array<{ id: number, name?: string, description?: string, type?: string }> }>}
 */
export async function pttAvmGetCargoProfiles(creds) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const res = await axios.get(PTTAVM_SHIPPING_CARGO_PROFILES, {
    headers: pttAvmHeaders(creds),
    timeout: 15000,
  });
  const data = res.data || {};
  return {
    cargoProfiles: Array.isArray(data.cargoProfiles) ? data.cargoProfiles : [],
  };
}

/**
 * Depo listesi (POST shipment.pttavm.com/api/v1/get-warehouse) – Kargo entegrasyonu, Basic Auth
 * @param {{ apiKey: string, accessToken: string }} creds
 * @returns {Promise<{ data: Array<{ id: number, name: string }>, error: boolean, msg?: string, status: boolean }>}
 */
export async function pttAvmGetWarehouses(creds) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli (Kargo API Basic Auth için kullanılır).");
  }
  const res = await axios.post(
    PTTAVM_SHIPMENT_GET_WAREHOUSE,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        ...pttAvmShipmentAuthHeader(creds),
      },
      timeout: 15000,
    }
  );
  const data = res.data || {};
  if (data.error === true || data.status === false) {
    throw new Error(data.msg || "Depo listesi alınamadı.");
  }
  return {
    data: Array.isArray(data.data) ? data.data : [],
    error: data.error === true,
    msg: data.msg ?? null,
    status: data.status === true,
  };
}

/**
 * Barkod oluştur (POST shipment.pttavm.com/api/v1/create-barcode) – Kargo entegrasyonu, Basic Auth
 * Body: { orders: [{ order_id, warehouse_id }] }. Aynı sipariş numarası farklı depo ile gönderilemez. tracking_id barkod sorgulama için kullanılır.
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {{ order_id: string, warehouse_id: number }[]} orders
 * @returns {Promise<{ tracking_id: string, count: number, code: number, success: boolean, message: string, error: boolean }>}
 */
export async function pttAvmCreateBarcode(creds, orders) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli (Kargo API Basic Auth).");
  }
  const list = Array.isArray(orders) ? orders : [];
  if (list.length === 0) {
    throw new Error("orders dizisi zorunludur ve en az bir eleman içermelidir (order_id, warehouse_id).");
  }
  const body = {
    orders: list.map((o) => ({
      order_id: String(o?.order_id ?? "").trim(),
      warehouse_id: Number(o?.warehouse_id),
    })),
  };
  const res = await axios.post(PTTAVM_SHIPMENT_CREATE_BARCODE, body, {
    headers: {
      "Content-Type": "application/json",
      ...pttAvmShipmentAuthHeader(creds),
    },
    timeout: 30000,
  });
  const data = res.data || {};
  if (data.error === true || data.success !== true) {
    throw new Error(data.message || "Barkod oluşturulamadı.");
  }
  return {
    tracking_id: data.tracking_id ?? "",
    count: Number(data.count) ?? 0,
    code: Number(data.code) ?? 200,
    success: data.success === true,
    message: data.message ?? "",
    error: data.error === true,
  };
}

/**
 * Barkod oluşturma kontrolü (POST shipment.pttavm.com/api/v1/barcode-status) – tracking_id ile sorgulama, Basic Auth
 * status: completed | error | pending
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {string} trackingId - create-barcode yanıtındaki tracking_id
 * @returns {Promise<{ tracking_id: string, status: string, data: Array<{ order_id: string, barcodes: string[] }>, error: string }>}
 */
export async function pttAvmGetBarcodeStatus(creds, trackingId) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli (Kargo API Basic Auth).");
  }
  const id = String(trackingId ?? "").trim();
  if (!id) throw new Error("tracking_id zorunludur (barkod oluşturma yanıtından).");
  const res = await axios.post(
    PTTAVM_SHIPMENT_BARCODE_STATUS,
    { tracking_id: id },
    {
      headers: {
        "Content-Type": "application/json",
        ...pttAvmShipmentAuthHeader(creds),
      },
      timeout: 15000,
    }
  );
  const data = res.data || {};
  return {
    tracking_id: data.tracking_id ?? id,
    status: data.status ?? "",
    data: Array.isArray(data.data) ? data.data : [],
    error: data.error ?? "",
  };
}

/**
 * Barkod etiket bilgisi (POST shipment.pttavm.com/api/v1/get-barcode-tag) – HTML veya ZPL, Basic Auth
 * type: "zpl" = Zebra yazıcı (zpl), null/omit = HTML çıktı
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {{ barcode: string, order_id: string, type?: string|null }} payload
 * @returns {Promise<{ content: string, contentType: string }>} content: HTML veya ZPL metni, contentType: "text/html" veya "text/plain"
 */
export async function pttAvmGetBarcodeTag(creds, payload) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli (Kargo API Basic Auth).");
  }
  const barcode = String(payload?.barcode ?? "").trim();
  const order_id = String(payload?.order_id ?? "").trim();
  if (!barcode || !order_id) {
    throw new Error("barcode ve order_id zorunludur.");
  }
  const type = payload?.type != null ? String(payload.type).trim() : null;
  const body = { barcode, order_id, type: type || null };
  const res = await axios.post(PTTAVM_SHIPMENT_GET_BARCODE_TAG, body, {
    headers: {
      "Content-Type": "application/json",
      ...pttAvmShipmentAuthHeader(creds),
    },
    timeout: 15000,
    responseType: "text",
  });
  const content = typeof res.data === "string" ? res.data : String(res.data ?? "");
  const contentType = type === "zpl" ? "text/plain" : "text/html";
  return { content, contentType };
}

/**
 * Barkod status güncelle / no-shipping siparişi teslim edildi yap (POST shipment.pttavm.com/api/v1/update-no-shipping-order), Basic Auth
 * Dijital ürün veya kargo sürecine tabi olmayan siparişler; hazırlık/gönderilmiş aşamasındakiler "teslim edildi" statüsüne çekilir.
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {string} orderId - Sipariş numarası (örn. PTT-12345-061024)
 * @returns {Promise<{ message: string, status: boolean }>}
 */
export async function pttAvmUpdateNoShippingOrder(creds, orderId) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli (Kargo API Basic Auth).");
  }
  const id = String(orderId ?? "").trim();
  if (!id) throw new Error("order_id zorunludur.");
  const res = await axios.post(
    PTTAVM_SHIPMENT_UPDATE_NO_SHIPPING_ORDER,
    { order_id: id },
    {
      headers: {
        "Content-Type": "application/json",
        ...pttAvmShipmentAuthHeader(creds),
      },
      timeout: 15000,
    }
  );
  const data = res.data || {};
  if (data.status === false && data.message) {
    throw new Error(data.message);
  }
  return {
    message: data.message ?? "",
    status: data.status === true,
  };
}

/**
 * Sipariş detay (GET /api/v1/orders/{orderId}) – Sipariş entegrasyonu
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {string|number} orderId - Sipariş id
 * @returns {Promise<Array>} Sipariş detay listesi (siparisNo, musteriAdi, siparisAdresi, siparisUrunler, barcodes, vb.)
 */
export async function pttAvmGetOrderDetail(creds, orderId) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const id = String(orderId ?? "").trim();
  if (!id) throw new Error("orderId zorunludur.");
  const url = `${PTTAVM_ORDERS_BASE}/${encodeURIComponent(id)}`.replace(/\/+/g, "/");
  const res = await axios.get(url, {
    headers: pttAvmHeaders(creds),
    timeout: 15000,
  });
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Sipariş kargo bilgi listesi (GET /api/v1/orders/{orderId}/cargo-infos) – Sipariş entegrasyonu
 * inCargo: 1=KargoDagitimda, 2=KargoTedarikcide, 3=KargoPttSubesinde | deliveryInfo: 1=pttSubesindeBekliyor, 2=pttSubesindenTeslimAlindi
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {string|number} orderId - Sipariş id
 * @returns {Promise<Array>} Kargo bilgi listesi (productId, shopId, inCargo, referenceCode, currentState, deliveryInfo)
 */
export async function pttAvmGetOrderCargoInfos(creds, orderId) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const id = String(orderId ?? "").trim();
  if (!id) throw new Error("orderId zorunludur.");
  const url = `${PTTAVM_ORDERS_BASE}/${encodeURIComponent(id)}/cargo-infos`.replace(/\/+/g, "/");
  const res = await axios.get(url, {
    headers: pttAvmHeaders(creds),
    timeout: 15000,
  });
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Sipariş arama / kontrol V2 (GET /api/v1/orders/search) – Tarih aralığında siparişler (max 40 gün)
 * isActiveOrders=true → sadece kargo_yapilmasi_bekleniyor; false → tüm siparişler
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {{ startDate: string, endDate: string, isActiveOrders: boolean }} params - Tarih formatı: 2024-01-01 veya ISO
 * @returns {Promise<Array>} Sipariş listesi (ürün kırılımı ile)
 */
export async function pttAvmOrdersSearch(creds, params) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const startDate = params?.startDate ? String(params.startDate).trim() : "";
  const endDate = params?.endDate ? String(params.endDate).trim() : "";
  const isActiveOrders = params?.isActiveOrders === true;
  if (!startDate || !endDate) {
    throw new Error("startDate ve endDate zorunludur.");
  }
  const q = new URLSearchParams();
  q.set("startDate", startDate);
  q.set("endDate", endDate);
  q.set("isActiveOrders", String(isActiveOrders));
  const url = `${PTTAVM_ORDERS_SEARCH}?${q.toString()}`;
  const res = await axios.get(url, {
    headers: pttAvmHeaders(creds),
    timeout: 30000,
  });
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Siparişe fatura gönder (POST /api/v1/orders/{orderId}/invoice)
 * lineItemId zorunlu (sipariş detaydaki lineItemId listesi). Fatura: url (öncelikli) veya content (Base64 PDF)
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {string|number} orderId - Sipariş id
 * @param {{ lineItemId: number[], content?: string, url?: string }} payload - content: Base64 PDF, url: PDF URL (biri gerekli)
 * @returns {Promise<{ success: boolean, error_Message?: string }>}
 */
export async function pttAvmSendOrderInvoice(creds, orderId, payload) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const id = String(orderId ?? "").trim();
  if (!id) throw new Error("orderId zorunludur.");
  const lineItemIds = Array.isArray(payload?.lineItemId) ? payload.lineItemId.map((x) => Number(x)).filter((n) => !Number.isNaN(n)) : [];
  if (lineItemIds.length === 0) {
    throw new Error("lineItemId (dizi) zorunludur. Sipariş detaydaki lineItemId değerlerini gönderin.");
  }
  const content = payload?.content != null ? String(payload.content).trim() : null;
  const url = payload?.url != null ? String(payload.url).trim() : null;
  if (!content && !url) {
    throw new Error("Fatura için content (Base64 PDF) veya url (PDF URL) alanlarından biri gerekli.");
  }
  const body = {
    lineItemId: lineItemIds,
    content: content || null,
    url: url || null,
  };
  const apiUrl = `${PTTAVM_ORDERS_BASE}/${encodeURIComponent(id)}/invoice`.replace(/\/+/g, "/");
  const res = await axios.post(apiUrl, body, {
    headers: pttAvmHeaders(creds),
    timeout: 60000,
  });
  const data = res.data || {};
  if (data.error_Message && !data.success) {
    throw new Error(data.error_Message);
  }
  return data;
}

/**
 * Barkod Kontrol Bulk – verilen barkodlara sahip ürün bilgileri (POST /api/v1/products/get-by-barcodes)
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {string[]} barcodes - Barkod listesi
 * @returns {Promise<Array>} Ürün listesi (urunId, barkod, urunAdi, miktar, kdVli, vb.)
 */
export async function pttAvmGetProductsByBarcodes(creds, barcodes) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const list = Array.isArray(barcodes) ? barcodes.map((b) => String(b ?? "").trim()).filter(Boolean) : [];
  const res = await axios.post(
    PTTAVM_PRODUCTS_GET_BY_BARCODES,
    { barcodes: list },
    {
      headers: pttAvmHeaders(creds),
      timeout: 30000,
    }
  );
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Hatalı ürün görselleri (POST /api/v1/products/get-faulty-images)
 * Sayfalandırma veya barkodlardan en az biri sağlanmalı. Barkodlarda max 10.000, pageSize max 10.000.
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {{ productBarcodes?: string[], paginationParameters?: { pageNumber: number, pageSize: number } }} options
 * @returns {Promise<{ success: boolean, message?: string, productImagesWithErrorList: Array }>}
 */
export async function pttAvmGetFaultyImages(creds, options = {}) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const body = {};
  const barcodes = options.productBarcodes;
  const pagination = options.paginationParameters;
  if (Array.isArray(barcodes) && barcodes.length > 0) {
    body.productBarcodes = barcodes.slice(0, 10000).map((b) => String(b ?? "").trim()).filter(Boolean);
  }
  if (pagination && (pagination.pageNumber != null || pagination.pageSize != null)) {
    const pageNumber = Math.max(1, Number(pagination.pageNumber) || 1);
    const pageSize = Math.min(10000, Math.max(1, Number(pagination.pageSize) || 10));
    body.paginationParameters = { pageNumber, pageSize };
  }
  if (!body.productBarcodes?.length && !body.paginationParameters) {
    throw new Error("Sayfalandırma parametreleri veya barkod listesinden en az biri sağlanmalıdır.");
  }
  const res = await axios.post(
    PTTAVM_PRODUCTS_GET_FAULTY_IMAGES,
    body,
    {
      headers: pttAvmHeaders(creds),
      timeout: 30000,
    }
  );
  const data = res.data || {};
  return {
    success: data.success === true,
    message: data.message ?? null,
    productImagesWithErrorList: Array.isArray(data.productImagesWithErrorList) ? data.productImagesWithErrorList : [],
  };
}

/**
 * Stok kontrol listesi / ürün arama (GET /api/v1/products/search)
 * Query: categoryId, subCategoryId, isActive (0:Hepsi 1:Aktif 2:Pasif), isInStock (0:Hepsi 1:Mevcut 2:Mevcut Değil), merchantCategoryId, searchPage, yeniKategoriId (opsiyonel)
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {{ categoryId?: string|number, subCategoryId?: string|number, isActive?: number, isInStock?: number, merchantCategoryId?: string|number, searchPage?: number, yeniKategoriId?: string|number }} params
 * @returns {Promise<Array>} Ürün listesi (urunId, barkod, urunAdi, miktar, kdVli, resimListesi, variantListesi vb.)
 */
export async function pttAvmProductsSearch(creds, params = {}) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const q = new URLSearchParams();
  const add = (key, value) => {
    if (value !== undefined && value !== null && value !== "") {
      q.set(key, String(value));
    }
  };
  add("categoryId", params.categoryId);
  add("subCategoryId", params.subCategoryId);
  add("isActive", params.isActive);
  add("isInStock", params.isInStock);
  add("merchantCategoryId", params.merchantCategoryId);
  add("searchPage", params.searchPage);
  add("yeniKategoriId", params.yeniKategoriId);
  const qs = q.toString();
  const url = qs ? `${PTTAVM_PRODUCTS_SEARCH}?${qs}` : PTTAVM_PRODUCTS_SEARCH;
  const res = await axios.get(url, {
    headers: pttAvmHeaders(creds),
    timeout: 30000,
  });
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Barkod Kontrol – tek barkod ile ürün bilgisi (GET /api/v1/products?barcode=...)
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {string} barcode - Barkod
 * @returns {Promise<object>} Ürün objesi (urunId, barkod, urunAdi, miktar, kdVli, resimListesi, variantListesi vb.)
 */
export async function pttAvmGetProductByBarcode(creds, barcode) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const code = String(barcode ?? "").trim();
  if (!code) throw new Error("Barkod zorunludur.");
  const url = `${PTTAVM_REST_BASE}/products?barcode=${encodeURIComponent(code)}`.replace(/\/+/g, "/");
  const res = await axios.get(url, {
    headers: pttAvmHeaders(creds),
    timeout: 15000,
  });
  return res.data && typeof res.data === "object" ? res.data : {};
}

/**
 * Kategori bilgisi (POST /api/v1/categories/{id}) – id'ye ait ana kategori ve children
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {string|number} categoryId - Kategori id (örn. 55)
 * @returns {Promise<{ success: boolean, category: { id, name, parent_id, updated_at, children }, error?: object }>}
 */
export async function pttAvmGetCategory(creds, categoryId) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const id = String(categoryId ?? "").trim();
  if (!id) throw new Error("Kategori id zorunludur.");
  const url = `${PTTAVM_REST_BASE}/categories/${encodeURIComponent(id)}`.replace(/\/+/g, "/");
  const res = await axios.post(
    url,
    {},
    {
      headers: pttAvmHeaders(creds),
      timeout: 15000,
    }
  );
  const data = res.data || {};
  if (data.error?.error_message && !data.success) {
    throw new Error(data.error.error_message || data.error.error_code || "Kategori bilgisi alınamadı.");
  }
  return data;
}

/**
 * Ürün aktif/pasif yap (PUT /api/v1/products/{productId}/status)
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {string|number} productId - PTT AVM ürün id
 * @param {boolean} isActive - true: Aktif, false: Pasif
 * @returns {Promise<{ success: boolean, errorMessage?: string, errorCode?: string }>}
 */
export async function pttAvmSetProductStatus(creds, productId, isActive) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const id = String(productId ?? "").trim();
  if (!id) throw new Error("Ürün id (productId) zorunludur.");
  const url = `${PTTAVM_REST_BASE}/products/${encodeURIComponent(id)}/status`.replace(/\/+/g, "/");
  const res = await axios.put(
    url,
    { isActive: Boolean(isActive) },
    {
      headers: pttAvmHeaders(creds),
      timeout: 15000,
    }
  );
  const data = res.data || {};
  if (data.errorMessage && !data.success) {
    throw new Error(data.errorMessage || data.errorCode || "Durum güncellenemedi.");
  }
  return data;
}

/**
 * Panel ürününü PTT AVM upsert items formatına dönüştürür
 * @param {object} product - Panel Product
 * @returns {object} PTT AVM item (name, barcode, categoryId, priceWithVat, vatRate, quantity, images, ...)
 */
function mapProductToPttItem(product) {
  const ptt = product.marketplaceSettings?.pttavm || {};
  const name = String(product.name || product.title || "").trim().slice(0, 200);
  const barcode = String(product.barcode || product.sku || product.barkod || product._id || "").trim() || null;
  const categoryId = ptt.categoryId != null ? Number(ptt.categoryId) : null;
  const vatRate = Number(product.vatRate ?? ptt.vatRate ?? 20);
  const priceWithVat = Number(product.price ?? product.priceTl ?? product.discountPriceTl ?? 0);
  const priceWithoutVat = vatRate === 0 ? priceWithVat : priceWithVat / (1 + vatRate / 100);
  const quantity = Math.max(0, Number(product.stock ?? product.quantity ?? 0));
  const shortDesc = String(product.description || product.aciklama || name).slice(0, 500);
  const longDesc = String(product.description || product.aciklama || name);
  const images = (product.images || [])
    .slice(0, 10)
    .map((img) => ({ url: typeof img === "string" ? img : img?.url }))
    .filter((i) => i.url);

  const item = {
    name: name || null,
    barcode,
    categoryId,
    priceWithoutVat: Math.round(priceWithoutVat * 100) / 100,
    vatRate: [0, 1, 10, 20].includes(vatRate) ? vatRate : 20,
    priceWithVat: Math.round(priceWithVat * 100) / 100,
    shortDescription: shortDesc || null,
    longDescription: longDesc || null,
    quantity,
    images: images.length ? images : null,
    desi: ptt.desi != null ? Number(ptt.desi) : null,
    active: true,
    discount: ptt.discount != null ? Number(ptt.discount) : 0,
  };

  if (product.gtin) item.gtin = String(product.gtin).trim();
  if (ptt.noShippingProduct != null) item.noShippingProduct = Boolean(ptt.noShippingProduct);
  if (ptt.basketMaxQuantity != null) item.basketMaxQuantity = Math.min(1000, Math.max(0, Number(ptt.basketMaxQuantity)));
  if (ptt.warrantyDuration != null) item.warrantyDuration = Math.min(24, Math.max(0, Number(ptt.warrantyDuration)));
  if (ptt.warrantySupplier) item.warrantySupplier = String(ptt.warrantySupplier).slice(0, 250);
  if (product.brand) item.brand = String(product.brand).trim();
  if (ptt.singleBox !== undefined && ptt.singleBox !== null) item.singleBox = Number(ptt.singleBox) === 1 ? 1 : 0;
  if (ptt.cargoProfileId != null && Number(ptt.cargoProfileId) >= 0) item.cargoProfileId = Number(ptt.cargoProfileId);
  if (ptt.estimatedCourierDelivery != null) item.estimatedCourierDelivery = Math.min(30, Math.max(0, Number(ptt.estimatedCourierDelivery)));
  if (product.productCode) item.productCode = String(product.productCode).trim();
  if (product.catalogBarcode) item.catalogBarcode = String(product.catalogBarcode).trim();
  if (ptt.isCargoFromSupplier != null) item.isCargoFromSupplier = Boolean(ptt.isCargoFromSupplier);
  if (Array.isArray(ptt.parts) && ptt.parts.length > 0) {
    item.parts = ptt.parts.slice(0, 20).map((p) => ({
      partNo: p?.partNo != null ? String(p.partNo).slice(0, 255) : null,
      desi: Number(p?.desi) || 0,
      partComment: p?.partComment != null ? String(p.partComment).slice(0, 255) : null,
    }));
  }

  return item;
}

/**
 * Ürün Ekleme/Güncelleme – ham items ile (POST /api/v1/products/upsert)
 * Kurallar: Boş liste gönderilemez, en fazla 1000 ürün, aynı talep 5 dk içinde tekrar gönderilemez.
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {object[]} items - PTT AVM item listesi (barcode, name, categoryId, priceWithVat, vatRate, quantity, images, vb.)
 * @returns {Promise<{ success: boolean, trackingId?: string, message?: string, countOfProductsToBeProcessed?: number }>}
 */
export async function pttAvmProductsUpsert(creds, items) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    throw new Error("Boş ürün listesi gönderilemez. En az bir item gerekli.");
  }
  if (list.length > 1000) {
    throw new Error("Bir talepte en fazla 1000 ürün gönderilebilir.");
  }
  const res = await axios.post(
    PTTAVM_PRODUCTS_UPSERT,
    { items: list },
    {
      headers: pttAvmHeaders(creds),
      timeout: 60000,
    }
  );
  const data = res.data || {};
  if (data.success !== true && data.message) {
    throw new Error(data.message);
  }
  return data;
}

/**
 * Fiyat/stok güncelle (POST /api/v1/products/stock-prices)
 * Kurallar: Boş liste yok, max 1000 ürün, barkod zorunlu, en az biri güncellenmeli: stok/fiyat/kdv/aktif. Stok 0-9999, indirim max 70, varyant max 100/ürün.
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {object[]} items - [{ barcode, active?, quantity?, priceWithoutVAT?, priceWithVAT?, vatRate?, discount?, variants?, isCargoFromSupplier? }]
 * @returns {Promise<{ success: boolean, trackingId?: string, message?: string, countOfProductsToBeProcessed?: number }>}
 */
export async function pttAvmUpdateStockPrices(creds, items) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    throw new Error("Boş ürün listesi gönderilemez. En az bir item gerekli.");
  }
  if (list.length > 1000) {
    throw new Error("Tek istekte en fazla 1000 ürün gönderilebilir.");
  }
  const res = await axios.post(
    PTTAVM_PRODUCTS_STOCK_PRICES,
    { items: list },
    {
      headers: pttAvmHeaders(creds),
      timeout: 60000,
    }
  );
  const data = res.data || {};
  if (data.success !== true && data.message) {
    throw new Error(data.message);
  }
  return data;
}

/**
 * İşlem takip – trackingId ile durum (GET /api/v1/products/tracking-result/{trackingId})
 * Hem ürün upsert hem de fiyat/stok güncelle (UpdateProductsStockPrice) sonrası dönen trackingId ile kullanılır.
 * Durumlar: Waiting, InProgress, Completed, Cancelled
 * @param {{ apiKey: string, accessToken: string }} creds
 * @param {string} trackingId - Upsert veya stock-prices yanıtında dönen trackingId
 * @returns {Promise<object>} { trackingId, status, progress, createdAt, updatedAt, productsSubTrackingResult }
 */
export async function pttAvmGetTrackingResult(creds, trackingId) {
  if (!creds?.apiKey || !creds?.accessToken) {
    throw new Error("PTT AVM Api-Key ve access-token gerekli.");
  }
  const id = String(trackingId ?? "").trim();
  if (!id) throw new Error("trackingId zorunludur.");
  const url = `${PTTAVM_REST_BASE}/products/tracking-result/${encodeURIComponent(id)}`.replace(/\/+/g, "/");
  const res = await axios.get(url, {
    headers: pttAvmHeaders(creds),
    timeout: 15000,
  });
  return res.data || {};
}

/**
 * PTT AVM'ye ürün ekler veya günceller (REST POST /products/upsert)
 * @param {object} product - Panel Product (name, barcode, categoryId, price, stock, images, marketplaceSettings.pttavm)
 * @param {import('next').NextApiRequest} [req] - İstek (kimlik bilgisi için)
 * @returns {Promise<{ success: boolean, productId?: string, trackingId?: string, message?: string }>}
 */
export async function pttAvmCreateProduct(product, req = null) {
  const creds = req ? await getPttAvmCredentials(req) : await getPttAvmCredentials(null);
  if (!creds?.apiKey || !creds?.accessToken) {
    return {
      success: false,
      message: "PTT AVM API bilgileri eksik. API Ayarları → PTT AVM bölümünden Api-Key ve access-token girin.",
    };
  }

  const ptt = product.marketplaceSettings?.pttavm || {};
  const categoryId = ptt.categoryId != null ? Number(ptt.categoryId) : null;
  const name = String(product.name || product.title || "").trim();
  const images = (product.images || []).filter((i) => (typeof i === "string" ? i : i?.url));

  if (!name) {
    return { success: false, message: "Ürün adı zorunludur." };
  }
  if (!categoryId) {
    return { success: false, message: "PTT AVM için kategori ID zorunludur. Ürün düzenle → Pazaryeri Ayarları → PTT AVM." };
  }
  if (images.length === 0) {
    return { success: false, message: "PTT AVM için en az bir görsel URL zorunludur." };
  }

  const item = mapProductToPttItem(product);

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    item.variants = product.variants.map((v) => ({
      variantBarcode: String(v.barcode || v.sku || product.barcode || "").trim() || null,
      quantity: Math.max(0, Number(v.stock ?? v.quantity ?? 0)),
      price: Number(v.priceTl ?? v.salePrice ?? 0),
      attributes: Array.isArray(v.attributes) ? v.attributes.map((a) => ({ value: a?.value ?? null, definition: a?.definition ?? null })) : [],
      ...(v.catalogBarcode != null ? { catalogBarcode: String(v.catalogBarcode) } : {}),
    }));
  }

  try {
    const data = await pttAvmProductsUpsert(creds, [item]);
    return {
      success: true,
      productId: data.trackingId ? String(data.trackingId) : (product.barcode || product._id?.toString()),
      trackingId: data.trackingId ? String(data.trackingId) : undefined,
      message: data.message || "Ürün PTT AVM'ye gönderildi.",
    };
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.message;
    if (status === 401) {
      return {
        success: false,
        message: "PTT AVM yetki hatası. Api-Key ve access-token kontrol edin.",
      };
    }
    return {
      success: false,
      message: msg && String(msg).slice(0, 300),
    };
  }
}
