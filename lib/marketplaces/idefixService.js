/**
 * İdefix Marketplace API
 * Auth: X-API-KEY = base64(ApiKey:ApiSecret)
 * Dokümantasyon: https://developer.idefix.com/
 */
import axios from "axios";
import { IDEFIX_PIM_TEST, IDEFIX_OMS_TEST, IDEFIX_PIM_PROD, IDEFIX_OMS_PROD } from "@/lib/idefixConfig";

/**
 * VENDOR TOKEN = base64(ApiKey:ApiSecret), header: X-API-KEY
 * @param {{ apiKey: string, apiSecret: string }} creds
 */
function idefixAuthHeader(creds) {
  const token = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`, "utf8").toString("base64");
  return { "X-API-KEY": token };
}

/**
 * Test/canlı base URL'ler
 * @param {{ testMode: boolean }} creds
 */
function getOmsBase(creds) {
  return creds.testMode !== false ? IDEFIX_OMS_TEST : IDEFIX_OMS_PROD;
}

function getPimBase(creds) {
  return creds.testMode !== false ? IDEFIX_PIM_TEST : IDEFIX_PIM_PROD;
}

/**
 * Kategori listesi – GET pim/product-category
 * Create servisinde kullanılacak categoryId değerleri buradan alınır. id, parentId, subs, name, topCategory
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @returns {Promise<Array<{ id: number, parentId: number, subs: array, name: string, topCategory: number }>>}
 */
export async function idefixGetProductCategories(creds) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("İdefix API Key ve API Secret gerekli.");
  }
  const base = getPimBase(creds);
  const path = creds.testMode !== false ? "/api/connector/product-category" : "/product-category";
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Kategori özellik listesi – GET pim/category-attribute/{categoryID}
 * Ürün create'te attributes bilgisi buradan alınır. En alt seviye kategori ID kullanılmalı (subs boş olan).
 * required = true olan alanlar create isteğinde mutlaka gönderilmelidir.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} categoryId - En alt seviyedeki kategori ID
 * @returns {Promise<{ id: number, name: string, categoryAttributes: Array }>}
 */
export async function idefixGetCategoryAttributes(creds, categoryId) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("İdefix API Key ve API Secret gerekli.");
  }
  const id = String(categoryId ?? "").trim();
  if (!id) throw new Error("categoryId (en alt seviye kategori ID) zorunludur.");

  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/category-attribute/${id}`
      : `/category-attribute/${id}`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  return res.data || {};
}

/**
 * Ülke (origin country) listesi – GET pim/country/origin-country
 * Create'te ürün denetim bilgileri (originCountryId) gönderilecekse ülke ID'leri buradan alınır.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ name?: string }} options - Opsiyonel: name ile ülke adı filtreleme
 * @returns {Promise<Array<{ id: number, name: string }>>}
 */
export async function idefixGetOriginCountries(creds, options = {}) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("İdefix API Key ve API Secret gerekli.");
  }
  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? "/api/connector/country/origin-country"
      : "/country/origin-country";
  const q = new URLSearchParams();
  if (options.name) q.set("name", String(options.name).trim());
  const query = q.toString();
  const url = `${base}${path}${query ? `?${query}` : ""}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Marka listesi – GET pim/brand
 * Ürün create'te gönderilecek marka bilgisi buradan alınır. page, size ile sayfalama.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ page?: number, size?: number }} options - Opsiyonel sayfalama
 * @returns {Promise<Array<{ id: number, title: string, slug: string, description, metaKeyword, metaTitle, metaDescription, exclusiveBrand: boolean, logo, bookPublisher: boolean }>>}
 */
export async function idefixGetBrands(creds, options = {}) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("İdefix API Key ve API Secret gerekli.");
  }
  const base = getPimBase(creds);
  const path = creds.testMode !== false ? "/api/connector/brand" : "/brand";
  const q = new URLSearchParams();
  if (options.page != null) q.set("page", String(options.page));
  if (options.size != null) q.set("size", String(options.size));
  const query = q.toString();
  const url = `${base}${path}${query ? `?${query}` : ""}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Marka listesi filtreleme – GET pim/brand/by-name?title={markaIsmi}
 * Create isteğinde markayı isimle aramak için kullanılır. Tek marka objesi döner.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string} title - Aranacak marka ismi
 * @returns {Promise<{ id: number, title: string, slug: string, description, metaKeyword, metaTitle, metaDescription, exclusiveBrand: boolean, logo, bookPublisher: boolean } | null>}
 */
export async function idefixGetBrandByName(creds, title) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("İdefix API Key ve API Secret gerekli.");
  }
  const t = String(title ?? "").trim();
  if (!t) throw new Error("title (aranacak marka ismi) zorunludur.");

  const base = getPimBase(creds);
  const path = creds.testMode !== false ? "/api/connector/brand/by-name" : "/brand/by-name";
  const q = new URLSearchParams();
  q.set("title", t);
  const url = `${base}${path}?${q.toString()}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return data && typeof data === "object" ? data : null;
}

/**
 * Marka ID ile arama – GET pim/brand/{markaId}
 * Create isteğinde markayı ID ile sorgulamak için kullanılır. Tek marka objesi döner.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} brandId - Aranacak marka ID
 * @returns {Promise<{ id: number, title: string, slug: string, description, metaKeyword, metaTitle, metaDescription, exclusiveBrand: boolean, logo, bookPublisher: boolean } | null>}
 */
export async function idefixGetBrandById(creds, brandId) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("İdefix API Key ve API Secret gerekli.");
  }
  const id = String(brandId ?? "").trim();
  if (!id) throw new Error("brandId (aranacak marka ID) zorunludur.");

  const base = getPimBase(creds);
  const path =
    creds.testMode !== false ? `/api/connector/brand/${id}` : `/brand/${id}`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return data && typeof data === "object" ? data : null;
}

/**
 * Marka isim arama – GET pim/brand/search-by-name?title={markaIsmi}
 * Create isteğinde markayı isimle aramak için kullanılır (search-by-name endpoint). Tek marka objesi döner.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string} title - Aranacak marka ismi
 * @returns {Promise<{ id: number, title: string, slug: string, description, metaKeyword, metaTitle, metaDescription, exclusiveBrand: boolean, logo, bookPublisher: boolean } | null>}
 */
export async function idefixGetBrandSearchByName(creds, title) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("İdefix API Key ve API Secret gerekli.");
  }
  const t = String(title ?? "").trim();
  if (!t) throw new Error("title (aranacak marka ismi) zorunludur.");

  const base = getPimBase(creds);
  const path = creds.testMode !== false ? "/api/connector/brand/search-by-name" : "/brand/search-by-name";
  const q = new URLSearchParams();
  q.set("title", t);
  const url = `${base}${path}?${q.toString()}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return data && typeof data === "object" ? data : null;
}

/**
 * Sevkiyat ve iade adres listesi – GET pim/vendor/{vendorId}/address
 * Create isteğinde kullanılacak sevkiyat/iade adres ID'leri buradan alınır.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @returns {Promise<Array<{ id: number, addressType: string, cityText: string, neighborhoodText: string, postalCode: string, fullAddress: string, isDefault: boolean, cityId: number, districtId: number, countyId: number, neighborhoodId: number }>>}
 */
export async function idefixGetVendorAddresses(creds) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/vendor/${vendorId}/address`
      : `/vendor/${vendorId}/address`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Müşteri soruları listesi (question/filter) – GET pim/vendor/{vendorId}/question/filter
 * Satıcıya yöneltilen müşteri sorularının listesi. PIM endpoint; page, limit, barcode, startDate/endDate (ms), sort (newest|oldest).
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ page?: number, limit?: number, barcode?: string, startDate?: number, endDate?: number, sort?: 'newest'|'oldest' }} [params]
 * @returns {Promise<Array<{ id: number, product: string, question: string, productQuestionAnswer: Array, readAt: string|null, publishedAt: string|null, createdAt: string, isArchived: boolean, customerId: number, customerName: string, showMyName: boolean }>>}
 */
export async function idefixGetQuestionFilter(creds, params = {}) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const q = new URLSearchParams();
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(Math.min(50, Math.max(1, Number(params.limit) || 10))));
  if (params.barcode && String(params.barcode).trim()) q.set("barcode", String(params.barcode).trim());
  if (params.startDate != null) q.set("startDate", String(params.startDate));
  if (params.endDate != null) q.set("endDate", String(params.endDate));
  if (params.sort === "oldest" || params.sort === "newest") q.set("sort", params.sort);
  q.set("vendor", vendorId);

  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/vendor/${vendorId}/question/filter`
      : `/vendor/${vendorId}/question/filter`;
  const url = `${base}${path}?${q.toString()}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

/**
 * Ürün sorusunu ID ile çekme (vendor-question) – GET pim/vendor/{vendorId}/question/{questionId}
 * Tek bir soruyu id bazında getirir. Yanıt: totalCount, itemCount, pageCount, currentPage, limit, items (soru objesi ile aynı yapı).
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} questionId - Soru ID (question/filter veya list’ten)
 * @returns {Promise<{ totalCount: number, itemCount: number, pageCount: number, currentPage: number, limit: number, items: Array }>}
 */
export async function idefixGetQuestionById(creds, questionId) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(questionId ?? "").trim();
  if (!id) throw new Error("questionId zorunludur.");

  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/vendor/${vendorId}/question/${encodeURIComponent(id)}`
      : `/vendor/${vendorId}/question/${encodeURIComponent(id)}`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data || {};
  return {
    totalCount: data.totalCount ?? 0,
    itemCount: data.itemCount ?? 0,
    pageCount: data.pageCount ?? 0,
    currentPage: data.currentPage ?? 1,
    limit: data.limit ?? 10,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

/**
 * Müşteri sorusuna cevap gönderme (question-answer) – POST pim/vendor/{vendorId}/question/{questionId}/answer
 * Ürün sorusunun cevaplanması. Body: answer_body. Yanıt: id, answerBody, likeCount, dislikeCount, bannedWords.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} questionId - Cevaplanacak soru ID
 * @param {string} answerBody - Cevap metni
 * @returns {Promise<{ id: number, answerBody: string, likeCount: number, dislikeCount: number, bannedWords: string|null }>}
 */
export async function idefixAnswerQuestion(creds, questionId, answerBody) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(questionId ?? "").trim();
  if (!id) throw new Error("questionId zorunludur.");
  const body = String(answerBody ?? "").trim();
  if (!body) throw new Error("answer_body (cevap metni) zorunludur.");

  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/vendor/${vendorId}/question/${encodeURIComponent(id)}/answer`
      : `/vendor/${vendorId}/question/${encodeURIComponent(id)}/answer`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { answer_body: body },
    {
      headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * Kargo şirketleri listesi – GET pim/cargo-company
 * Create isteğinde gönderilecek kargo firma ID'leri buradan alınır.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @returns {Promise<Array<{ id: number, title: string, code: string, taxNumber: string }>>}
 */
export async function idefixGetCargoCompanies(creds) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("İdefix API Key ve API Secret gerekli.");
  }
  const base = getPimBase(creds);
  const path = creds.testMode !== false ? "/api/connector/cargo-company" : "/cargo-company";
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Platform kargo profil listesi – GET pim/cargo-company/profile/list
 * Platformda tanımlı kargo profil bilgileri ve ID'leri. cargoCompany, status, takip/anlaşma bilgileri.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @returns {Promise<Array<{ title, cargoCompany: { id, title, code, taxNumber }, status, cargoIntegrationUrl, cargoTrackingUrl, cargoUserCredential, isPlatformTrackingSupport, isSellerTrackingSupport, isPlatformAgreementSupport, isSellerAgreementSupport, isPlatformCargoSend, isSellerCargoSend, acceptReturn, fullCoverage, acceptHomeReturn }>>}
 */
export async function idefixGetCargoProfileList(creds) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("İdefix API Key ve API Secret gerekli.");
  }
  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? "/api/connector/cargo-company/profile/list"
      : "/cargo-company/profile/list";
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Satıcı kargo profil listesi – GET pim/cargo-company/{vendorId}/profile/list
 * Satıcıya tanımlı kargo profil bilgileri ve ID'leri (vendorId creds'tan).
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @returns {Promise<Array<{ id: number, vendorId: number, title, cargoCompany, status, isPlatformIntegrated, cargoIntegrationUrl, cargoTrackingUrl, cargoUserCredential, isPlatformTrackingSupport, isPlatformAgreementSupport, isSellerAgreementSupport, isPlatformCargoSend, isSellerCargoSend, acceptReturn, fullCoverage, acceptHomeReturn, startAt }>>}
 */
export async function idefixGetVendorCargoProfileList(creds) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/cargo-company/${vendorId}/profile/list`
      : `/cargo-company/${vendorId}/profile/list`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Ürünlerim listesi – GET pim/pool/{vendorId}/list
 * Marketplace'e gönderilen tüm ürünler. Pagination (page, limit) zorunludur.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ page: number, limit: number, barcode?: string, state?: string }} params - page ve limit zorunlu
 * @returns {Promise<{ products: Array }>}
 */
export async function idefixGetProductList(creds, params = {}) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  if (params.page == null || params.limit == null) {
    throw new Error("Ürün listesi için page ve limit zorunludur.");
  }
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("limit", String(params.limit));
  if (params.barcode) q.set("barcode", params.barcode);
  if (params.state) q.set("state", params.state);
  const query = q.toString();

  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/pool/${vendorId}/list`
      : `/pool/${vendorId}/list`;
  const url = `${base}${path}?${query}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return data && typeof data === "object" ? data : { products: [] };
}

/**
 * Ürün oluşturma – POST pim/pool/{vendorId}/create
 * Önce marka listesi, kategori listesi ve category-attribute (required=true alanlar zorunlu) alınmalı. Yanıttaki batchRequestId ile batch-result'tan durum sorgulanır.
 * Varyantlı ürünlerde aynı productMainId ile birden fazla ürün gönderilir.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {Array} products - Zorunlu: barcode, title, productMainId, brandId, categoryId, inventoryQuantity, vendorStockCode, description, price, vatRate, images[].url, attributes (required olanlar)
 * @returns {Promise<{ products?: Array, lastUpdatedAt?: string, completedAt?: string, createdAt?: string, status?: string, batchRequestId?: string }>}
 */
export async function idefixCreateProducts(creds, products) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const list = Array.isArray(products) ? products : [];
  if (list.length === 0) throw new Error("En az bir ürün (products) gerekli.");

  const base = getPimBase(creds);
  const vendorId = String(creds.vendorId).trim();
  const path =
    creds.testMode !== false
      ? `/api/connector/pool/${vendorId}/create`
      : `/pool/${vendorId}/create`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { products: list },
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 90000,
    }
  );
  return res.data || {};
}

/**
 * Sevkiyat listesi – GET oms/{vendorId}/list (canlı) veya test path
 * orderNumber = ana sipariş numarası, id = sevkiyat ID. Kurumsal fatura: invoiceAddress.isCommercial = "1"; company, taxNumber, taxOffice oradan alınır.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ ids?: string, orderNumber?: string, state?: string, startDate?: string, endDate?: string, lastUpdatedAt?: string, page?: number, limit?: number, sortByField?: string, sortDirection?: string }} params - vendor zorunlu (creds'tan), sortByField: id|createAt|updateAt, sortDirection: desc|asc
 */
export async function idefixGetShipmentList(creds, params = {}) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const q = new URLSearchParams();
  if (params.vendor !== undefined) q.set("vendor", params.vendor);
  else q.set("vendor", vendorId);
  if (params.ids) q.set("ids", params.ids);
  if (params.orderNumber) q.set("orderNumber", params.orderNumber);
  if (params.state) q.set("state", params.state);
  if (params.startDate) q.set("startDate", params.startDate);
  if (params.endDate) q.set("endDate", params.endDate);
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.sortByField) q.set("sortByField", params.sortByField);
  if (params.sortDirection) q.set("sortDirection", params.sortDirection);
  if (params.lastUpdatedAt) q.set("lastUpdatedAt", params.lastUpdatedAt);

  const base = getOmsBase(creds);
  const url =
    creds.testMode !== false
      ? `${base}/api/shipment/connect/${vendorId}/list?${q.toString()}`
      : `${base}/${vendorId}/list?${q.toString()}`;

  const res = await axios.get(url, {
    headers: {
      "Content-Type": "application/json",
      ...idefixAuthHeader(creds),
    },
    timeout: 30000,
  });
  const data = res.data || {};
  return {
    totalCount: data.totalCount ?? 0,
    itemCount: data.itemCount ?? 0,
    pageCount: data.pageCount ?? 0,
    currentPage: data.currentPage ?? 1,
    limit: data.limit ?? 10,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

/**
 * İade listesi (claim-list) – GET oms/{vendorId}/claim-list
 * İdefix'te iade talebi oluşan shipment'ları listeler. Parametreler: ids, orderNumber, claimReason, startDate, endDate, lastUpdatedAt, page, limit.
 * Item statüleri: ready, in_cargo, waiting_vendor_approve, approved, decline, vendor_decline_request.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ ids?: string, orderNumber?: string, claimReason?: string|number, startDate?: string, endDate?: string, lastUpdatedAt?: string, page?: number, limit?: number }} [params]
 * @returns {Promise<{ totalCount: number, itemCount: number, pageCount: number, currentPage: number, limit: number, items: Array }>}
 */
export async function idefixGetClaimList(creds, params = {}) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const q = new URLSearchParams();
  if (params.ids) q.set("ids", params.ids);
  if (params.orderNumber) q.set("orderNumber", params.orderNumber);
  if (params.claimReason != null) q.set("claimReason", String(params.claimReason));
  if (params.startDate) q.set("startDate", params.startDate);
  if (params.endDate) q.set("endDate", params.endDate);
  if (params.lastUpdatedAt) q.set("lastUpdatedAt", params.lastUpdatedAt);
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/claim-list`
      : `/${vendorId}/claim-list`;
  const url = `${base}${path}${q.toString() ? `?${q.toString()}` : ""}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data || {};
  return {
    totalCount: data.totalCount ?? 0,
    itemCount: data.itemCount ?? 0,
    pageCount: data.pageCount ?? 0,
    currentPage: data.currentPage ?? 1,
    limit: data.limit ?? 50,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

/**
 * İade talep sebep listesi (claim-reasons) – GET oms/{vendorId}/claim-reasons
 * claim-create isteklerinde ve claim-list dönen sebep ID'lerinin anlamı için kullanılır. id, name, type (platform|customer).
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @returns {Promise<Array<{ id: number, name: string, type: string }>>}
 */
export async function idefixGetClaimReasons(creds) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/claim-reasons`
      : `/${vendorId}/claim-reasons`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * İade talep onayı (claim-approve) – POST oms/{vendorId}/{claimId}/claim-approve
 * Depoya teslim edilmiş iade taleplerindeki kalemleri onaylar. claimId ve claimLineIds claim-list'ten alınır (items[].id, items[].items[].id).
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} claimId - İade talep ID (claim-list items[].id)
 * @param {(string|number)[]} claimLineIds - Onaylanacak kalem ID'leri (claim-list items[].items[].id)
 * @returns {Promise<Object>}
 */
export async function idefixClaimApprove(creds, claimId, claimLineIds) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(claimId ?? "").trim();
  if (!id) throw new Error("claimId zorunludur.");
  const lineIds = Array.isArray(claimLineIds)
    ? claimLineIds.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (lineIds.length === 0) throw new Error("claimLineIds (onaylanacak kalem ID'leri) en az bir eleman içermelidir.");

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/claim-approve`
      : `/${vendorId}/${encodeURIComponent(id)}/claim-approve`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { claimLineIds: lineIds },
    {
      headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * İade red talebi sebep listesi (claim-decline-reasons) – GET oms/claim-decline-reasons
 * claim-decline-request servisinde kullanılacak red sebep ID'leri. Path vendorId içermez. Yanıt: id, name, description, createdAt, updatedAt, deletedAt.
 * @param {{ apiKey: string, apiSecret: string, vendorId?: string, testMode: boolean }} creds
 * @returns {Promise<Array<{ id: number, name: string, description: string|null, createdAt: string, updatedAt: string, deletedAt: string|null }>>}
 */
export async function idefixGetClaimDeclineReasons(creds) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("İdefix API Key ve API Secret gerekli.");
  }
  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? "/api/shipment/connect/claim-decline-reasons"
      : "/claim-decline-reasons";
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * İade red talebi oluşturma (claim-decline-request) – POST oms/{vendorId}/{claimId}/claim-decline-request
 * Depoya teslim edilmiş iade taleplerini inceleyip red talebi oluşturur. claimId/claimLine id'leri claim-list'ten, claimDeclineReasonId claim-decline-reasons'tan.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} claimId - İade talep ID (path; claim-list items[].id)
 * @param {{ id: number, claimDeclineReasonId: number, description?: string, images?: string[] }[]} claimLines - id: kalem ID (claim-list items[].items[].id), claimDeclineReasonId: claim-decline-reasons'tan
 * @returns {Promise<Object>}
 */
export async function idefixClaimDeclineRequest(creds, claimId, claimLines) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(claimId ?? "").trim();
  if (!id) throw new Error("claimId zorunludur.");
  const lines = Array.isArray(claimLines) ? claimLines : [];
  if (lines.length === 0) throw new Error("claimLines en az bir kalem içermelidir.");
  for (const line of lines) {
    if (line.id == null) throw new Error("Her claimLine için id (kalem ID) zorunludur.");
    if (line.claimDeclineReasonId == null) throw new Error("Her claimLine için claimDeclineReasonId zorunludur.");
  }

  const body = {
    claimLines: lines.map((line) => {
      const o = { id: Number(line.id), claimDeclineReasonId: Number(line.claimDeclineReasonId) };
      if (line.description != null && String(line.description).trim() !== "") o.description = String(line.description).trim();
      if (Array.isArray(line.images) && line.images.length) o.images = line.images.map((img) => String(img));
      return o;
    }),
  };

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/claim-decline-request`
      : `/${vendorId}/${encodeURIComponent(id)}/claim-decline-request`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(url, body, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  return res.data || {};
}

/**
 * İade satıcıya ulaştı bildirimi (claim-delivered-to-vendor) – POST oms/{vendorId}/{claimId}/claim-delivered-to-vendor
 * Depoya teslim edilmiş iadeler için, onay/red yapmadan önce çalıştırılması gereken servis. Sonrasında claim-approve veya claim-decline-request kullanılır.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} claimId - İade talep ID (path; claim-list items[].id)
 * @param {(string|number)[]} claimLineIds - Satıcıya ulaştı bildirilecek kalem ID'leri (claim-list items[].items[].id)
 * @returns {Promise<Object>}
 */
export async function idefixClaimDeliveredToVendor(creds, claimId, claimLineIds) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(claimId ?? "").trim();
  if (!id) throw new Error("claimId zorunludur.");
  const lineIds = Array.isArray(claimLineIds)
    ? claimLineIds.map((x) => (typeof x === "number" ? x : parseInt(String(x).trim(), 10))).filter((n) => !Number.isNaN(n))
    : [];
  if (lineIds.length === 0) throw new Error("claimLineIds (işlem yapılacak kalem ID'leri) en az bir eleman içermelidir.");

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/claim-delivered-to-vendor`
      : `/${vendorId}/${encodeURIComponent(id)}/claim-delivered-to-vendor`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { claimLineIds: lineIds },
    {
      headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * İade talebi oluşturma (claim-create) – POST oms/{vendorId}/claim-create
 * Müşteri iade kodu almadan depoya iletilen siparişler için iade talebi açar. Oluşturulan iade claim-list ile çekilir.
 * reasonId: claim-reasons servisinden. orderLineId: sipariş kalem ID (list/claim-list ile ilişkili).
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ customerId: number, orderNumber?: string, vendorCargoCompanyId?: number, vendorCargoProfileId?: number, items: Array<{ reasonId: number, orderLineId: number, customerNote?: string }>, images?: string[], claimType?: string }} payload
 * @returns {Promise<Object>}
 */
export async function idefixClaimCreate(creds, payload) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const customerId = payload?.customerId;
  if (customerId == null) throw new Error("customerId (müşteri ID) zorunludur.");
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length === 0) throw new Error("items en az bir kalem içermelidir (reasonId, orderLineId).");
  for (const item of items) {
    if (item.reasonId == null) throw new Error("Her item için reasonId (claim-reasons'tan) zorunludur.");
    if (item.orderLineId == null) throw new Error("Her item için orderLineId (iade edilecek kalem ID) zorunludur.");
  }

  const body = {
    customerId: Number(customerId),
    items: items.map((item) => {
      const o = { reasonId: Number(item.reasonId), orderLineId: Number(item.orderLineId) };
      if (item.customerNote != null && String(item.customerNote).trim() !== "") o.customerNote = String(item.customerNote).trim();
      return o;
    }),
  };
  if (payload?.orderNumber != null && String(payload.orderNumber).trim() !== "") body.orderNumber = String(payload.orderNumber).trim();
  if (payload?.vendorCargoCompanyId != null) body.vendorCargoCompanyId = Number(payload.vendorCargoCompanyId);
  if (payload?.vendorCargoProfileId != null) body.vendorCargoProfileId = Number(payload.vendorCargoProfileId);
  if (Array.isArray(payload?.images) && payload.images.length) body.images = payload.images.map((u) => String(u));
  if (payload?.claimType != null && String(payload.claimType).trim() !== "") body.claimType = String(payload.claimType).trim();

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/claim-create`
      : `/${vendorId}/claim-create`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(url, body, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  return res.data || {};
}

/**
 * İşçilik bedeli gönderme – POST oms/{vendorId}/update-labor-cost-amount
 * Sevkiyat statüsü "delivered" olana kadar istek gönderilebilir. laborCostAmount >= 0 ve item faturalandırılacak tutarından büyük olamaz. Yalnızca belirli kategori ID'leri için beslenebilir.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ orderItemId: number, laborCostAmount: number }[]} laborCostAmountItemRequests - orderItemId: ürün id, laborCostAmount: işçilik bedeli tutarı
 * @returns {Promise<{ laborCostAmountItemRequests?: Array, laborCostAmountData?: string[] }>}
 */
export async function idefixUpdateLaborCostAmount(creds, laborCostAmountItemRequests) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const list = Array.isArray(laborCostAmountItemRequests) ? laborCostAmountItemRequests : [];
  if (list.length === 0) throw new Error("En az bir kayıt (laborCostAmountItemRequests) gerekli.");

  const base = getOmsBase(creds);
  const vendorId = String(creds.vendorId).trim();
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/update-labor-cost-amount`
      : `/${vendorId}/update-labor-cost-amount`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { laborCostAmountItemRequests: list },
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * Shipment statü güncelleme – POST oms/{vendorId}/{shipmentId}/update-shipment-status
 * picking: depoda hazırlanmaya geçti, müşteri iptal edemez. invoiced: fatura kesildi, invoiceNumber ile bildirilir.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} shipmentId - Statüsü güncellenecek shipment ID (list cevabındaki items[].id)
 * @param {{ status: 'picking'|'invoiced', invoiceNumber?: string }} payload - invoiced için invoiceNumber zorunlu
 * @returns {Promise<Object>}
 */
export async function idefixUpdateShipmentStatus(creds, shipmentId, payload) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(shipmentId ?? "").trim();
  if (!id) throw new Error("shipmentId zorunludur.");
  const status = payload?.status;
  if (status !== "picking" && status !== "invoiced") {
    throw new Error("status 'picking' veya 'invoiced' olmalıdır.");
  }

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/update-shipment-status`
      : `/${vendorId}/${encodeURIComponent(id)}/update-shipment-status`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const body = { status };
  if (payload.invoiceNumber != null) body.invoiceNumber = String(payload.invoiceNumber);

  const res = await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
      ...idefixAuthHeader(creds),
    },
    timeout: 30000,
  });
  return res.data || {};
}

/**
 * Fatura linki gönderme – POST oms/{vendorId}/{shipmentId}/invoice-link
 * E-Arşiv veya e-Fatura linkinin İdefix'e iletilmesi.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} shipmentId - Fatura linkinin gönderileceği shipment ID (list cevabındaki items[].id)
 * @param {string} invoiceLink - Fatura linki URL (örn. https://faturalinki.com)
 * @returns {Promise<Object>}
 */
export async function idefixSendInvoiceLink(creds, shipmentId, invoiceLink) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(shipmentId ?? "").trim();
  if (!id) throw new Error("shipmentId zorunludur.");
  const link = String(invoiceLink ?? "").trim();
  if (!link) throw new Error("invoiceLink (fatura linki URL) zorunludur.");

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/invoice-link`
      : `/${vendorId}/${encodeURIComponent(id)}/invoice-link`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { invoiceLink: link },
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * Sipariş bölme (split-package) – POST oms/{vendorId}/{shipmentId}/split-package
 * Shipment'ı birden fazla sevkiyata böler. splitPackageDetails'te hangi item'ların hangi pakette olacağı gönderilir; gönderilmeyen item'lar yeni bir shipment'a eklenir. Eski shipment statüsü shipment_split olur; yeni shipment'lar list servisi ile çekilir.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} shipmentId - Bölünecek shipment ID (list cevabındaki items[].id)
 * @param {{ items: Array<{ id: number }> }[]} splitPackageDetails - Her eleman bir paket; items = o paketteki kalemlerin id'leri (shipment items[].id)
 * @returns {Promise<Object>}
 */
export async function idefixSplitPackage(creds, shipmentId, splitPackageDetails) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(shipmentId ?? "").trim();
  if (!id) throw new Error("shipmentId zorunludur.");
  const details = Array.isArray(splitPackageDetails) ? splitPackageDetails : [];
  if (details.length === 0) throw new Error("splitPackageDetails en az bir paket (items dizisi) içermelidir.");

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/split-package`
      : `/${vendorId}/${encodeURIComponent(id)}/split-package`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { splitPackageDetails: details },
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * Tedarik edememe sebep listesi (noship) – GET oms/{vendorId}/reasons/noship
 * unsupplied servisine istekte kullanılacak sebep ID'leri buradan alınır.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @returns {Promise<Array<{ id: number, name: string, reasonType: string, description: string, createdAt: string, updatedAt: string, deletedAt: string|null }>>}
 */
export async function idefixGetNoshipReasons(creds) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/reasons/noship`
      : `/${vendorId}/reasons/noship`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * İptal sebep listesi (reasons/cancel) – GET oms/{vendorId}/reasons/cancel
 * Müşteri iptallerinin sebep ID listesi. Yanıt: id, name, reasonType (cancel), description, createdAt, updatedAt, deletedAt.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @returns {Promise<Array<{ id: number, name: string, reasonType: string, description: string|null, createdAt: string, updatedAt: string, deletedAt: string|null }>>}
 */
export async function idefixGetCancelReasons(creds) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/reasons/cancel`
      : `/${vendorId}/reasons/cancel`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Tedarik edilemedi bildirimi (unsupplied) – POST oms/{vendorId}/{shipmentId}/unsupplied
 * Shipment içindeki bir veya daha fazla ürünü tedarik edemediği için iptal etmek için. reasonId reasons/noship listesinden alınır. İşlem sonrası shipment'ta ürün kalırsa aynı orderNumber'da yeni shipmentId oluşur; list tekrar çekilmelidir.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} shipmentId - Tedarik edilemeyen shipment ID (list items[].id)
 * @param {{ id: number, reasonId: number }[]} items - id: tedarik edilemeyen item ID (shipment items[].id), reasonId: reasons/noship'ten
 * @returns {Promise<Object>}
 */
export async function idefixUnsupplied(creds, shipmentId, items) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(shipmentId ?? "").trim();
  if (!id) throw new Error("shipmentId zorunludur.");
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) throw new Error("En az bir kalem (items[].id, items[].reasonId) gerekli.");

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/unsupplied`
      : `/${vendorId}/${encodeURIComponent(id)}/unsupplied`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { items: list },
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * Kargo kodu bildirme (update-tracking-number) – POST oms/{vendorId}/{shipmentId}/update-tracking-number
 * Sevkiyat için kargo takip numarası ve URL gönderilir; sipariş statüsü shipment_in_cargo olarak güncellenir.
 * trackingUrl, siparişte seçilmiş kargo profili ile uyumlu olmalıdır; uyuşmazlıkta change-cargo-provider kullanılmalıdır.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} shipmentId - Kargo kodu bildirilecek shipment ID (list items[].id)
 * @param {{ trackingUrl: string, trackingNumber: string }} payload - trackingUrl: takip URL, trackingNumber: takip numarası
 * @returns {Promise<Object>}
 */
export async function idefixUpdateTrackingNumber(creds, shipmentId, payload) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(shipmentId ?? "").trim();
  if (!id) throw new Error("shipmentId zorunludur.");
  const urlVal = String(payload?.trackingUrl ?? "").trim();
  const numVal = String(payload?.trackingNumber ?? "").trim();
  if (!urlVal) throw new Error("trackingUrl (kargo takip URL) zorunludur.");
  if (!numVal) throw new Error("trackingNumber (kargo takip numarası) zorunludur.");

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/update-tracking-number`
      : `/${vendorId}/${encodeURIComponent(id)}/update-tracking-number`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { trackingUrl: urlVal, trackingNumber: numVal },
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * Alternatif teslimat ile gönderim (alternative-cargo-tracking) – POST oms/{vendorId}/{shipmentId}/alternative-cargo-tracking
 * Alternatif teslimat (kendi aracım, servis vb.) veya platformun sorgulayamadığı kargolar için takip bilgisi gönderilir.
 * vendorCargoProfile: vendor/profile/list'ten isSellerTrackingSupport ve isPlatformAgreementSupport false olan profil ID.
 * isPhoneNumber true ise trackingInfo.phoneNumber zorunlu; false ise trackingInfo.trackingUrl zorunlu.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} shipmentId - Takip bildirilecek shipment ID (list items[].id)
 * @param {{ vendorCargoProfile: number, isPhoneNumber: boolean, trackingInfo?: { trackingUrl?: string, phoneNumber?: string }, trackingNumber?: string, boxQuantity?: number, desi?: number }} payload
 * @returns {Promise<Object>}
 */
export async function idefixAlternativeCargoTracking(creds, shipmentId, payload) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(shipmentId ?? "").trim();
  if (!id) throw new Error("shipmentId zorunludur.");
  const profileId = payload?.vendorCargoProfile;
  if (profileId == null || (typeof profileId !== "number" && typeof profileId !== "string")) {
    throw new Error("vendorCargoProfile (alternatif teslimat/kargo profil ID) zorunludur.");
  }
  const isPhone = payload?.isPhoneNumber === true;
  const trackingInfo = payload?.trackingInfo && typeof payload.trackingInfo === "object" ? payload.trackingInfo : {};
  if (isPhone) {
    const phone = String(trackingInfo.phoneNumber ?? "").trim();
    if (!phone) throw new Error("isPhoneNumber true olduğunda trackingInfo.phoneNumber zorunludur.");
  } else {
    const url = String(trackingInfo.trackingUrl ?? "").trim();
    if (!url) throw new Error("isPhoneNumber false olduğunda trackingInfo.trackingUrl zorunludur.");
  }

  const ti = {};
  if (trackingInfo.trackingUrl && String(trackingInfo.trackingUrl).trim()) ti.trackingUrl = String(trackingInfo.trackingUrl).trim();
  if (trackingInfo.phoneNumber && String(trackingInfo.phoneNumber).trim()) ti.phoneNumber = String(trackingInfo.phoneNumber).trim();
  const body = {
    trackingInfo: ti,
    vendorCargoProfile: Number(profileId),
    isPhoneNumber: isPhone,
  };
  if (payload?.trackingNumber != null && String(payload.trackingNumber).trim() !== "") body.trackingNumber = String(payload.trackingNumber).trim();
  if (payload?.boxQuantity != null) body.boxQuantity = Number(payload.boxQuantity);
  if (payload?.desi != null) body.desi = Number(payload.desi);

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/alternative-cargo-tracking`
      : `/${vendorId}/${encodeURIComponent(id)}/alternative-cargo-tracking`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(url, body, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  return res.data || {};
}

/**
 * Teslim edildi bilgisi gönderme (manual-deliver) – POST oms/{vendorId}/{shipmentId}/manual-deliver
 * Alternatif kargo ile yapılan gönderimler için teslim bildirimi.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} shipmentId - Teslim bilgisi gönderilecek shipment ID (list items[].id)
 * @param {{ deliverDocumentUrl?: string, deliveryCode?: string }} [payload] - Opsiyonel: teslim döküman URL, teslim kodu
 * @returns {Promise<Object>}
 */
export async function idefixManualDeliver(creds, shipmentId, payload = {}) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(shipmentId ?? "").trim();
  if (!id) throw new Error("shipmentId zorunludur.");

  const body = {};
  if (payload?.deliverDocumentUrl != null && String(payload.deliverDocumentUrl).trim() !== "")
    body.deliverDocumentUrl = String(payload.deliverDocumentUrl).trim();
  if (payload?.deliveryCode != null && String(payload.deliveryCode).trim() !== "")
    body.deliveryCode = String(payload.deliveryCode).trim();

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/manual-deliver`
      : `/${vendorId}/${encodeURIComponent(id)}/manual-deliver`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(url, Object.keys(body).length ? body : {}, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  return res.data || {};
}

/**
 * Desi, koli bilgisi gönderme (update-box-info) – POST oms/{vendorId}/{shipmentId}/update-box-info
 * Lojistik kargo gönderileri için desi ve koli sayısı bildirimi.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} shipmentId - Desi/koli bilgisi gönderilecek shipment ID (list items[].id)
 * @param {{ boxQuantity: number, desi: number }} payload - boxQuantity: koli sayısı, desi: desi bilgisi
 * @returns {Promise<Object>}
 */
export async function idefixUpdateBoxInfo(creds, shipmentId, payload) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(shipmentId ?? "").trim();
  if (!id) throw new Error("shipmentId zorunludur.");
  const boxQ = payload?.boxQuantity;
  const desiVal = payload?.desi;
  if (boxQ == null || Number(boxQ) < 0) throw new Error("boxQuantity (koli sayısı) zorunludur ve 0 veya pozitif olmalıdır.");
  if (desiVal == null || Number(desiVal) < 0) throw new Error("desi zorunludur ve 0 veya pozitif olmalıdır.");

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/update-box-info`
      : `/${vendorId}/${encodeURIComponent(id)}/update-box-info`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { boxQuantity: Number(boxQ), desi: Number(desiVal) },
    {
      headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * Gönderi seçeneği değişikliği (change-cargo-provider) – POST oms/{vendorId}/{shipmentId}/change-cargo-provider/{vendorCargoProfile}
 * Platform öder anlaşmalı veya platform tarafından takip edilebilen shipment'ların kargo profili değiştirilir.
 * vendorCargoProfile: vendor/cargo-company/profile'dan dönen isSellerTrackingSupport veya isPlatformAgreementSupport true olan profil ID.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string|number} shipmentId - Kargo değiştirilecek shipment ID (list items[].id)
 * @param {string|number} vendorCargoProfile - Yeni kargo profil ID (vendor/cargo-company/profile listesinden)
 * @returns {Promise<Object>}
 */
export async function idefixChangeCargoProvider(creds, shipmentId, vendorCargoProfile) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(shipmentId ?? "").trim();
  if (!id) throw new Error("shipmentId zorunludur.");
  const profileId = vendorCargoProfile != null ? String(vendorCargoProfile).trim() : "";
  if (!profileId) throw new Error("vendorCargoProfile (kargo profil ID) zorunludur.");

  const base = getOmsBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/shipment/connect/${vendorId}/${encodeURIComponent(id)}/change-cargo-provider/${encodeURIComponent(profileId)}`
      : `/${vendorId}/${encodeURIComponent(id)}/change-cargo-provider/${encodeURIComponent(profileId)}`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(url, {}, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  return res.data || {};
}

/**
 * Bağlantı testi – sevkiyat listesi 1 kayıt ile dener veya hafif bir endpoint
 */
export async function idefixTestConnection(creds) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  try {
    const result = await idefixGetShipmentList(creds, { page: 1, limit: 1 });
    return { success: true, message: "İdefix API bağlantısı başarılı.", totalCount: result.totalCount };
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error("Yetki hatası (401). API Key ve API Secret doğru olmalı. VENDOR_TOKEN_NOT_EXIST kontrol edin.");
    }
    if (err.response?.status === 403) {
      throw new Error("Erişim reddedildi. Test ortamında IP yetkilendirmesi gerekebilir.");
    }
    throw err;
  }
}

/**
 * Hızlı ürün ekleme – POST pim/catalog/{vendorId}/fast-listing
 * Katalogda kayıtlı ve global barkodlu ürünleri mapping olmadan satışa açar. Katalogda yoksa yüklenmez; yeni ürünler için create kullanılmalı.
 * Yanıttaki batchRequestId ile toplu hızlı ürün durumu sorgulanır; eşleşenler onay/red (approve-item / decline-item) ile işlenir.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ barcode: string, title: string, vendorStockCode: string, price: number, comparePrice?: number, inventoryQuantity: number }[]} items - Zorunlu: barcode, title, vendorStockCode, price, inventoryQuantity
 * @returns {Promise<{ items: Array, lastUpdatedAt: string, completedAt: string|null, createdAt: string, status: string, batchRequestId: string }>}
 */
export async function idefixFastListing(creds, items) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) throw new Error("En az bir ürün (items) gerekli.");

  const base = getPimBase(creds);
  const vendorId = String(creds.vendorId).trim();
  const path =
    creds.testMode !== false
      ? `/api/connector/catalog/${vendorId}/fast-listing`
      : `/catalog/${vendorId}/fast-listing`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { items: list },
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 60000,
    }
  );
  return res.data || {};
}

/**
 * Hızlı ürün ekleme durum sorgulama – POST pim/catalog/{vendorId}/fast-listing-result/{batchID}
 * fast-listing yanıtındaki batchRequestId ile ürünlerin durumunu sorgular. status: COMPLETED | DECLINE.
 * DECLINE hata kodları: PRODUCT_POOL_ALREADY_EXIST, PRODUCT_BARCODE_NOT_EXIST, VENDOR_CATEGORY_ACCESS_DENIED, VENDOR_ACCESS_DENIED, BRAND_EXCLUSIVE_NOT_AUTHORIZED.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {string} batchId - fast-listing yanıtındaki batchRequestId
 * @returns {Promise<{ items: Array, lastUpdatedAt: string, completedAt: string|null, createdAt: string, status: string, batchRequestId: string }>}
 */
export async function idefixGetFastListingResult(creds, batchId) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(batchId ?? "").trim();
  if (!id) throw new Error("batchId (batchRequestId) zorunludur.");

  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/catalog/${vendorId}/fast-listing-result/${encodeURIComponent(id)}`
      : `/catalog/${vendorId}/fast-listing-result/${encodeURIComponent(id)}`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * Stok ve fiyat gönderimi – POST pim/catalog/{vendorId}/inventory-upload
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ barcode: string, price?: number, comparePrice?: number, inventoryQuantity?: number, maximumPurchasableQuantity?: number, deliveryDuration?: number, deliveryType?: string, isZoneSale?: boolean }[]} items
 */
export async function idefixInventoryUpload(creds, items) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) throw new Error("En az bir ürün (barcode) gerekli.");

  const base = getPimBase(creds);
  const vendorId = String(creds.vendorId).trim();
  const path =
    creds.testMode !== false
      ? `/api/connector/catalog/${vendorId}/inventory-upload`
      : `/catalog/${vendorId}/inventory-upload`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { items: list },
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 60000,
    }
  );
  return res.data || {};
}

/**
 * Stok/fiyat toplu işlem sonucu – GET pim/catalog/{vendorId}/inventory-result/{batchId}
 * inventory-upload yanıtındaki batchRequestId ile sorgulanır.
 * items[].status: created | decline | completed. decline ise failureReasons: DATA_PARSE_ERROR | BATCH_NOT_EXIST | BATCH_ALREADY_PROCESSED | PRODUCT_NOT_FOUND | CATALOG_PRICE_LOCKED
 */
export async function idefixGetInventoryResult(creds, batchId) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(batchId ?? "").trim();
  if (!id) throw new Error("batchId (batchRequestId) zorunludur.");

  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/catalog/${vendorId}/inventory-result/${id}`
      : `/catalog/${vendorId}/inventory-result/${id}`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  return res.data || {};
}

/**
 * Stok ve fiyat güncel durum listesi – GET pim/catalog/{vendorId}/inventory/list
 * Ürünlerin güncel stok ve fiyat bilgilerini döner.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @returns {Promise<{ items: Array<{ barcode: string, stockCode: string, price: number, comparePrice: number, inventoryQuantity: number }> }>}
 */
export async function idefixGetInventoryList(creds) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/catalog/${vendorId}/inventory/list`
      : `/catalog/${vendorId}/inventory/list`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  const data = res.data;
  return data && typeof data === "object" ? data : { items: [] };
}

/**
 * Ürün toplu işlem sonucu – GET pim/pool/{vendorId}/batch-result/{batchId}
 * Ürün create işleminde dönen batchRequestId ile sorgulanır.
 * products[].status (waiting_catalog_action, waiting_vendor_approve, ready_for_sale, vendor_declined, missing_info, platform_declined, not_matched, auto_matched, manual_matched), matchedProduct, failureReasons. Batch status: created | completed | running | failed | cancelled.
 */
export async function idefixGetBatchResult(creds, batchId) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const vendorId = String(creds.vendorId).trim();
  const id = String(batchId ?? "").trim();
  if (!id) throw new Error("batchId (batchRequestId) zorunludur.");

  const base = getPimBase(creds);
  const path =
    creds.testMode !== false
      ? `/api/connector/pool/${vendorId}/batch-result/${encodeURIComponent(id)}`
      : `/pool/${vendorId}/batch-result/${encodeURIComponent(id)}`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.get(url, {
    headers: { "Content-Type": "application/json", ...idefixAuthHeader(creds) },
    timeout: 30000,
  });
  return res.data || {};
}

/**
 * Ürün merchant onayı – POST pim/pool/{vendorId}/approve-item
 * waiting_vendor_approve statüsündeki (katalogda eşleşen) ürünleri onaylar. İstek: items[] içinde barcode.
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ barcode: string }[]} items - Onaylanacak ürünlerin barkodları
 * @returns {Promise<{ items?: Array }>}
 */
export async function idefixApproveItem(creds, items) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) throw new Error("En az bir ürün (items[].barcode) gerekli.");

  const base = getPimBase(creds);
  const vendorId = String(creds.vendorId).trim();
  const path =
    creds.testMode !== false
      ? `/api/connector/pool/${vendorId}/approve-item`
      : `/pool/${vendorId}/approve-item`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { items: list },
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * Ürün merchant red – POST pim/pool/{vendorId}/decline-item
 * waiting_vendor_approve statüsündeki ürünlerin eşleşmeyi reddedilmesi (aynı ürün değilse birleştirmeyi red).
 * @param {{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean }} creds
 * @param {{ barcode: string }[]} items - Reddedilecek ürünlerin barkodları
 * @returns {Promise<{ items?: Array }>}
 */
export async function idefixDeclineItem(creds, items) {
  if (!creds?.apiKey || !creds?.apiSecret || !creds?.vendorId) {
    throw new Error("İdefix API Key, API Secret ve Satıcı ID (vendorId) gerekli.");
  }
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) throw new Error("En az bir ürün (items[].barcode) gerekli.");

  const base = getPimBase(creds);
  const vendorId = String(creds.vendorId).trim();
  const path =
    creds.testMode !== false
      ? `/api/connector/pool/${vendorId}/decline-item`
      : `/pool/${vendorId}/decline-item`;
  const url = `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");

  const res = await axios.post(
    url,
    { items: list },
    {
      headers: {
        "Content-Type": "application/json",
        ...idefixAuthHeader(creds),
      },
      timeout: 30000,
    }
  );
  return res.data || {};
}

/**
 * Ürün oluşturma – placeholder (gerçek create dokümana göre genişletilebilir)
 */
export async function idefixCreateProduct(product) {
  console.log("Idefix Product Create (placeholder):", product?.name);
  return {
    success: true,
    productId: "IDFX_" + Date.now(),
    message: "İdefix ürün gönderimi için stok/fiyat veya ürün entegrasyonu endpoint'leri kullanılabilir.",
  };
}
