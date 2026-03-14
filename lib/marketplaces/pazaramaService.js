/**
 * Pazarama İş Ortağım API Service
 * OAuth client_credentials ile token alır, Bearer ile istek yapar.
 */
import axios from "axios";
import {
  PAZARAMA_AUTH_URL,
  PAZARAMA_API_BASE,
  PAZARAMA_BASE,
  PAZARAMA_SCOPE,
  PAZARAMA_RATE_LIMIT_MS,
  PAZARAMA_STOCK_BATCH_SIZE,
} from "./pazaramaConfig";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";

/** Token cache: { apiKey: { token, expiresAt } } - 55 dakika geçerli */
const tokenCache = new Map();

/** Rate limit: son stok/fiyat isteği zamanı (10 sn arası) */
const lastStockPriceRequest = new Map();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitRateLimit(apiKey) {
  const last = lastStockPriceRequest.get(apiKey) || 0;
  const elapsed = Date.now() - last;
  if (elapsed < PAZARAMA_RATE_LIMIT_MS) {
    await sleep(PAZARAMA_RATE_LIMIT_MS - elapsed);
  }
  lastStockPriceRequest.set(apiKey, Date.now());
}

/**
 * Pazarama OAuth token alır (client_credentials)
 * @param {{ apiKey: string, apiSecret: string }} creds
 * @returns {Promise<string>} accessToken
 */
export async function getPazaramaToken(creds) {
  if (!creds?.apiKey || !creds?.apiSecret) {
    throw new Error("Pazarama API Key ve API Secret gerekli.");
  }
  const cached = tokenCache.get(creds.apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const res = await axios.post(
    PAZARAMA_AUTH_URL,
    new URLSearchParams({
      grant_type: "client_credentials",
      scope: PAZARAMA_SCOPE,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      timeout: 15000,
    }
  );

  const data = res.data;
  if (!data?.success || !data?.data?.accessToken) {
    throw new Error(data?.message || "Pazarama token alınamadı.");
  }

  const token = data.data.accessToken;
  const expiresIn = (data.data.expiresIn || 3600) * 1000;
  tokenCache.set(creds.apiKey, { token, expiresAt: Date.now() + expiresIn - 5 * 60 * 1000 });
  return token;
}

/**
 * API isteği yapar (otomatik token)
 * @param {object} options - axios options
 * @param {{ apiKey: string, apiSecret: string }} creds
 */
async function pazaramaRequest(options, creds) {
  const token = await getPazaramaToken(creds);
  const url = options.url?.startsWith("http") ? options.url : `${PAZARAMA_API_BASE}${options.url}`.replace(/\/+/g, "/");
  const res = await axios({
    ...options,
    url,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res.data;
}

/**
 * Kategori ağacı (doküman: GET {baseurl}/category/getCategoryTree)
 * CreateProduct için leaf:true kategoriler kullanılmalı
 * baseurl = isortagimapi.pazarama.com (order gibi /api/ kullanmıyor olabilir)
 */
export async function pazaramaGetCategories(creds) {
  const token = await getPazaramaToken(creds);
  const override = process.env.PAZARAMA_CATEGORY_TREE_URL;
  const urlsToTry = override
    ? [override]
    : [
        `${PAZARAMA_BASE}category/getCategoryTree`,
        `${PAZARAMA_API_BASE}category/getCategoryTree`,
      ];
  let lastErr;
  for (const url of urlsToTry) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });
      const data = res.data;
      if (data && (Array.isArray(data.data) || data.success === true || data.data != null))
        return data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  const msg = lastErr?.response?.status === 404
    ? "Pazarama kategori API 404 veriyor. Doğru endpoint için Pazarama entegrasyon dokümanını kontrol edin."
    : (lastErr?.message || "Pazarama kategori alınamadı");
  throw new Error(msg);
}

/**
 * Marka listesi (brand/getBrands)
 * @param {object} creds - { apiKey, apiSecret }
 * @param {number} [page=1] - Sayfa
 * @param {number} [size=100] - Sayfa başına kayıt (max 100000)
 * @param {string} [name] - Marka adına göre filtre (opsiyonel)
 */
export async function pazaramaGetBrands(creds, page = 1, size = 100, name = "") {
  const token = await getPazaramaToken(creds);
  const params = new URLSearchParams();
  params.set("Page", String(Number(page) || 1));
  params.set("Size", String(Number(size) || 100));
  if (name && String(name).trim()) params.set("name", String(name).trim());
  const qs = params.toString();
  const basePath = `brand/getBrands${qs ? `?${qs}` : ""}`;
  const urls = [
    `${PAZARAMA_BASE}${basePath}`,
    `${PAZARAMA_API_BASE}${basePath}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      const data = res.data;
      if (data && (Array.isArray(data.data) || data.success === true || data.data != null)) {
        return data;
      }
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  const msg =
    lastErr?.response?.status === 404
      ? "Pazarama marka API 404 veriyor. Endpoint kontrolü gerekebilir."
      : lastErr?.message || "Pazarama marka listesi alınamadı";
  throw new Error(msg);
}

/**
 * Kategori özellikleri (doküman: GET {baseurl}/category/getCategoryWithAttributes?Id=...)
 * CreateProduct için attributeId + attributeValueId (attributeValues[].id) gönderilir
 */
export async function pazaramaGetCategoryWithAttributes(creds, categoryId) {
  const token = await getPazaramaToken(creds);
  const urls = [
    `${PAZARAMA_BASE}category/getCategoryWithAttributes?Id=${encodeURIComponent(categoryId)}`,
    `${PAZARAMA_API_BASE}category/getCategoryWithAttributes?Id=${encodeURIComponent(categoryId)}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      const data = res.data;
      if (data?.success !== false && (data?.data || data)) return data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama kategori özellikleri alınamadı");
}

/**
 * Şehirler (doküman: GET {baseurl}/parameter/cities)
 * Teslimat tipi için şehir ID seçimi
 */
export async function pazaramaGetCities(creds) {
  const token = await getPazaramaToken(creds);
  const urls = [
    `${PAZARAMA_BASE}parameter/cities`,
    `${PAZARAMA_API_BASE}parameter/cities`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      const data = res.data;
      if (data?.success !== false && (data?.data != null || data)) return data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama şehir listesi alınamadı");
}

/**
 * Soru statüleri (Satıcıya Soru Sor)
 * GET QuestionAnswer/getQuestionStatus
 */
export async function pazaramaGetQuestionStatus(creds) {
  return pazaramaRequest(
    { method: "GET", url: "QuestionAnswer/getQuestionStatus" },
    creds
  );
}

/**
 * Soru konuları (Soru konularına göre sorgulama)
 * POST QuestionAnswer/questionTopics
 */
export async function pazaramaGetQuestionTopics(creds) {
  const token = await getPazaramaToken(creds);
  const urls = [
    `${PAZARAMA_BASE}QuestionAnswer/questionTopics`,
    `${PAZARAMA_API_BASE}QuestionAnswer/questionTopics`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), {}, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama soru konuları alınamadı");
}

/**
 * Sorulmuş soruları filtrele (detaylı)
 * GET QuestionAnswer/getApprovalAnswersByMerchant
 * query: pageIndex, pageSize, questionStatus (opsiyonel)
 */
export async function pazaramaGetApprovalAnswersByMerchant(creds, { pageIndex = 1, pageSize = 10, questionStatus = null } = {}) {
  const token = await getPazaramaToken(creds);
  const params = new URLSearchParams();
  params.set("pageIndex", String(Number(pageIndex) || 1));
  params.set("pageSize", String(Number(pageSize) || 10));
  if (questionStatus != null && questionStatus !== "") params.set("questionStatus", String(questionStatus));
  const qs = params.toString();
  const urls = [
    `${PAZARAMA_BASE}QuestionAnswer/getApprovalAnswersByMerchant${qs ? `?${qs}` : ""}`,
    `${PAZARAMA_API_BASE}QuestionAnswer/getApprovalAnswersByMerchant${qs ? `?${qs}` : ""}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama sorulmuş sorular alınamadı");
}

/**
 * ID ile sorulmuş sorunun detayını getir
 * GET QuestionAnswer/getApprovalAnswerById?questionId=...
 */
export async function pazaramaGetApprovalAnswerById(creds, questionId) {
  if (!questionId || String(questionId).trim() === "") {
    throw new Error("questionId gerekli");
  }
  const token = await getPazaramaToken(creds);
  const qs = `?questionId=${encodeURIComponent(String(questionId).trim())}`;
  const urls = [
    `${PAZARAMA_BASE}QuestionAnswer/getApprovalAnswerById${qs}`,
    `${PAZARAMA_API_BASE}QuestionAnswer/getApprovalAnswerById${qs}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama soru detayı alınamadı");
}

/**
 * Sorulmuş soruya cevap ver
 * PUT QuestionAnswer/sellerAnswer
 * body: { questionId, text }
 */
export async function pazaramaSellerAnswer(creds, { questionId, text }) {
  if (!questionId || String(questionId).trim() === "") {
    throw new Error("questionId gerekli");
  }
  if (!text || String(text).trim() === "") {
    throw new Error("text (cevap metni) gerekli");
  }
  const token = await getPazaramaToken(creds);
  const body = {
    questionId: String(questionId).trim(),
    text: String(text).trim(),
  };
  const urls = [
    `${PAZARAMA_BASE}QuestionAnswer/sellerAnswer`,
    `${PAZARAMA_API_BASE}QuestionAnswer/sellerAnswer`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.put(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama soru cevabı gönderilemedi");
}

/**
 * Sorulmuş soruların yanıtlarını özet olarak filtrele
 * POST QuestionAnswer/getApprovalAnswersByMerchantSearch
 * body: barcode, topicId, questionStartDate, questionEndDate, questionStatus, pageIndex, pageSize
 */
export async function pazaramaGetApprovalAnswersByMerchantSearch(creds, params = {}) {
  const token = await getPazaramaToken(creds);
  const body = {
    barcode: params.barcode ?? null,
    topicId: params.topicId ?? null,
    questionStartDate: params.questionStartDate ?? null,
    questionEndDate: params.questionEndDate ?? null,
    questionStatus: params.questionStatus ?? null,
    pageIndex: Number(params.pageIndex) || 1,
    pageSize: Number(params.pageSize) || 10,
  };
  const urls = [
    `${PAZARAMA_BASE}QuestionAnswer/getApprovalAnswersByMerchantSearch`,
    `${PAZARAMA_API_BASE}QuestionAnswer/getApprovalAnswersByMerchantSearch`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama soru yanıtları özeti alınamadı");
}

/** Soru statü kodları */
export const PAZARAMA_QUESTION_STATUS = {
  0: "Cevap Bekliyor",
  1: "Cevaplandı",
  2: "Onay Bekliyor",
  3: "Reddedildi",
};

/**
 * Ürün ekleme
 * @param {object} product - ERP Product model
 * @param {import('next').NextApiRequest|{ apiKey: string, apiSecret: string }|null} [reqOrCredentials] - API route req (token ile DB'den alır) veya credentials
 */
export async function pazaramaCreateProduct(product, reqOrCredentials = null) {
  const creds = reqOrCredentials && typeof reqOrCredentials.headers === "object"
    ? await getPazaramaCredentials(reqOrCredentials)
    : reqOrCredentials || await getPazaramaCredentials(null);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return { success: false, message: "Pazarama API bilgileri eksik. API Ayarları → Pazarama." };
  }

  const pz = product.marketplaceSettings?.pazarama || {};
  const categoryId = pz.categoryId != null ? (typeof pz.categoryId === "number" ? pz.categoryId : String(pz.categoryId).trim() || null) : null;
  const brandId = pz.brandId != null ? (typeof pz.brandId === "number" ? pz.brandId : String(pz.brandId).trim() || null) : null;
  const images = (product.images || []).slice(0, 8).map((u) => ({
    imageurl: typeof u === "string" ? u : u?.url || "",
  })).filter((i) => i.imageurl);

  if (!categoryId || !brandId) {
    return { success: false, message: "Pazarama için kategori ve marka ID zorunlu. Ürün düzenle → Pazaryeri Ayarları." };
  }
  if (images.length === 0) {
    return { success: false, message: "En az 1 görsel URL gerekli." };
  }

  const attributes = Array.isArray(pz.attributes) ? pz.attributes : [];
  const code = String(product.barcode || product.sku || product._id).replace(/\s/g, "").slice(0, 500);
  const groupCode = code.slice(0, 10);
  const stockCode = String(product.sku || product.barcode || code).slice(0, 100);
  const listPrice = Number(product.priceTl ?? product.discountPriceTl ?? product.price ?? 0);
  const salePrice = Number(product.discountPriceTl ?? product.price ?? product.priceTl ?? listPrice);

  const item = {
    name: String(product.name || "").slice(0, 100),
    displayName: String(product.name || "").slice(0, 250),
    description: String(product.description || product.name || ""),
    brandId: /^\d+$/.test(String(brandId)) ? Number(brandId) : brandId,
    desi: Number(pz.desi ?? pz.dimensionalWeight ?? 1) || 1,
    code,
    groupCode,
    stockCode,
    stockCount: Math.max(0, Number(product.stock ?? 0)),
    vatRate: Number(product.vatRate ?? pz.vatRate ?? 20),
    listPrice,
    salePrice,
    categoryId: /^\d+$/.test(String(categoryId)) ? Number(categoryId) : categoryId,
    images,
    attributes: attributes.map((a) => ({
      attributeId: a.attributeId,
      attributeValueId: a.attributeValueId,
    })),
  };

  // Temin bilgisi (tekildürün): productCommercials + productCommercialAdditionalInfo
  const commercialInfo = pz.productCommercialAdditionalInfo ?? product.productCommercialAdditionalInfo;
  const commercialRef = pz.productCommercials ?? product.productCommercials;
  if (commercialRef?.productCommercialId) {
    item.productCommercials = { productCommercialId: String(commercialRef.productCommercialId) };
  }
  if (commercialInfo?.securityDescription != null) {
    item.productCommercialAdditionalInfo = { securityDescription: String(commercialInfo.securityDescription) };
  }
  // Uyarı görselleri: onaylanmış securityDescriptionId'ler (product-security-descriptions/approved listesinden)
  const securityIds = pz.securityDescriptionIdList ?? product.securityDescriptionIdList;
  if (Array.isArray(securityIds) && securityIds.length > 0) {
    item.securityDescriptionIdList = securityIds.map((id) => String(id)).filter(Boolean);
  }
  // İzlenebilirlik-Ambalaj: productBatchInfo (parti/seri no, skt) + securityDocuments (kullanım kılavuzu, ön/arka ambalaj)
  const batchInfo = pz.productBatchInfo ?? product.productBatchInfo;
  if (batchInfo && (batchInfo.batchNumber != null || batchInfo.serialNumber != null || batchInfo.expirationDate != null)) {
    item.productBatchInfo = {};
    if (batchInfo.batchNumber != null) item.productBatchInfo.batchNumber = String(batchInfo.batchNumber).slice(0, 25);
    if (batchInfo.serialNumber != null) item.productBatchInfo.serialNumber = String(batchInfo.serialNumber).slice(0, 25);
    if (batchInfo.expirationDate != null) item.productBatchInfo.expirationDate = batchInfo.expirationDate;
  }
  const securityDocs = pz.securityDocuments ?? product.securityDocuments;
  if (Array.isArray(securityDocs) && securityDocs.length > 0) {
    item.securityDocuments = securityDocs
      .filter((d) => d?.url && [1, 2, 3].includes(Number(d?.type)))
      .map((d) => ({ url: String(d.url), type: Number(d.type) }));
  }
  // Max satış stok adedi: siparişte max alınabilecek adet (0 veya yok = sınırsız)
  const saleLimit = pz.productSaleLimitQuantity ?? product.productSaleLimitQuantity;
  if (saleLimit != null && Number(saleLimit) > 0) {
    item.productSaleLimitQuantity = Number(saleLimit);
  }

  const payload = { products: [item] };

  try {
    await waitRateLimit(creds.apiKey);
    const token = await getPazaramaToken(creds);
    const urls = [
      `${PAZARAMA_BASE}product/create`,
      `${PAZARAMA_API_BASE}product/create`,
    ];
    let data;
    let lastErr;
    for (const url of urls) {
      try {
        const res = await axios.post(url.replace(/\/+/g, "/"), payload, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          timeout: 30000,
        });
        data = res.data;
        break;
      } catch (err) {
        lastErr = err;
        if (err.response?.status !== 404) throw err;
      }
    }
    if (!data) throw lastErr;
    if (data?.success && data?.data?.batchRequestId) {
      return {
        success: true,
        productId: data.data.batchRequestId,
        message: data?.userMessage || "Pazarama'ya ürün gönderildi.",
      };
    }
    const errMsg = data?.data?.error?.message || data?.userMessage || data?.message || data?.errorMessage || "Pazarama yanıt hatası";
    return {
      success: false,
      message: errMsg,
    };
  } catch (err) {
    const msg = err.response?.data?.userMessage || err.response?.data?.message || err.response?.data?.errorMessage || err.message;
    return { success: false, message: msg };
  }
}

/** Ürün batch statü kodları */
export const PAZARAMA_BATCH_STATUS = {
  1: "InProgress",
  2: "Done",
  3: "Error",
};

/**
 * Batch işlem sonucu (ürün ekleme sonrası batchRequestId ile sorgu)
 * GET product/getProductBatchResult?BatchRequestId=...
 * Not: Create'den sonra 4 saat içinde sorgulanabilir
 */
export async function pazaramaGetProductBatchResult(creds, batchRequestId) {
  const token = await getPazaramaToken(creds);
  const urls = [
    `${PAZARAMA_BASE}product/getProductBatchResult?BatchRequestId=${encodeURIComponent(batchRequestId)}`,
    `${PAZARAMA_API_BASE}product/getProductBatchResult?BatchRequestId=${encodeURIComponent(batchRequestId)}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama batch sonucu alınamadı");
}

/**
 * Katalog ürün sorgusu (barkod/ada göre)
 * POST product/getProductTitleCodeSearch
 * Body: { code, name, size, page, sellerId }
 */
export async function pazaramaSearchCatalogProducts(creds, { code = "", name = "", page = 1, size = 10 } = {}) {
  const token = await getPazaramaToken(creds);
  const sellerId = creds.sellerId || "";
  const body = {
    code: String(code || "").trim(),
    name: String(name || "").trim(),
    page: Number(page) || 1,
    size: Number(size) || 10,
    sellerId: sellerId || undefined,
  };
  const urls = [
    `${PAZARAMA_BASE}product/getProductTitleCodeSearch`,
    `${PAZARAMA_API_BASE}product/getProductTitleCodeSearch`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama katalog sorgusu alınamadı");
}

/**
 * Hızlı ürün ekleme (katalogdaki ürünü barkod ile)
 * POST product/addProductsWithBarcodes
 * Body: { product: { productId, code, stockCode, listPrice, stockCount, salePrice, installmentCount, brandId } }
 */
export async function pazaramaAddProductsWithBarcodes(creds, product) {
  const token = await getPazaramaToken(creds);
  const p = product?.product ?? product;
  if (!p?.productId) throw new Error("productId gerekli");

  const body = {
    product: {
      productId: String(p.productId),
      code: p.code != null ? String(p.code) : undefined,
      stockCode: p.stockCode != null ? String(p.stockCode) : undefined,
      listPrice: p.listPrice != null ? Number(p.listPrice) : undefined,
      stockCount: p.stockCount != null ? Number(p.stockCount) : undefined,
      salePrice: p.salePrice != null ? Number(p.salePrice) : undefined,
      installmentCount: p.installmentCount != null ? Number(p.installmentCount) : undefined,
      brandId: p.brandId ? String(p.brandId) : undefined,
    },
  };
  const urls = [
    `${PAZARAMA_BASE}product/addProductsWithBarcodes`,
    `${PAZARAMA_API_BASE}product/addProductsWithBarcodes`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama hızlı ürün ekleme başarısız");
}

/**
 * Ürün filtreleme (onaylanmış / onaylanmamış)
 * GET product/products?Approved=true|false&Code=...&Page=1&Size=250
 * State: 1=Onay Bekliyor İlk, 2=Onay Bekliyor Güncelleme, 3=Onaylandı, 6=Reddedildi, 7=Redden Dönüp Güncellenenler
 */
export async function pazaramaGetProducts(creds, { approved = true, code = "", page = 1, size = 250 } = {}) {
  const token = await getPazaramaToken(creds);
  const params = new URLSearchParams({
    Approved: String(approved === true || approved === "true" || approved === 1),
    Page: String(Number(page) || 1),
    Size: String(Number(size) || 250),
  });
  if (code && String(code).trim()) params.set("Code", String(code).trim());

  const urls = [
    `${PAZARAMA_BASE}product/products?${params}`,
    `${PAZARAMA_API_BASE}product/products?${params}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama ürün listesi alınamadı");
}

/**
 * Tekli ürün detayı (Code ile)
 * POST product/getProductDetail
 * Body: { Code: "barkod" }
 */
export async function pazaramaGetProductDetail(creds, code) {
  const c = String(code ?? "").trim();
  if (!c) throw new Error("Code (barkod) gerekli");

  const token = await getPazaramaToken(creds);
  const body = { Code: c };
  const urls = [
    `${PAZARAMA_BASE}product/getProductDetail`,
    `${PAZARAMA_API_BASE}product/getProductDetail`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama ürün detayı alınamadı");
}

/**
 * Ürün temin bilgisi: ürüne şablon atama
 * POST product/upsertSellerProductCommercial
 * code zorunlu; securityDescription, commercialIds girilmezse mevcut sıfırlanır
 */
export async function pazaramaUpsertSellerProductCommercial(creds, { code, securityDescription, commercialIds }) {
  const c = String(code ?? "").trim();
  if (!c) throw new Error("Code (barkod) zorunlu");

  const token = await getPazaramaToken(creds);
  const body = {
    code: c,
    ...(securityDescription !== undefined && { securityDescription: String(securityDescription) }),
    ...(commercialIds !== undefined && { commercialIds: Array.isArray(commercialIds) ? commercialIds : [] }),
  };
  const urls = [
    `${PAZARAMA_BASE}product/upsertSellerProductCommercial`,
    `${PAZARAMA_API_BASE}product/upsertSellerProductCommercial`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama ürün temin bilgisi güncellenemedi");
}

/**
 * Satıcı temin şablonlarını listele
 * GET product-commercials
 */
export async function pazaramaGetProductCommercials(creds) {
  const token = await getPazaramaToken(creds);
  const urls = [
    `${PAZARAMA_BASE}product-commercials`,
    `${PAZARAMA_API_BASE}product-commercials`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama temin şablonları alınamadı");
}

/**
 * Satıcı temin şablonu oluştur
 * POST product-commercials
 * type: 0=Yerli İmalatçı, 1=İthalatçı, 2=Yetkili Temsilci, 3=İfa Hizmet Sağlayıcı
 */
export async function pazaramaCreateProductCommercial(creds, payload) {
  const token = await getPazaramaToken(creds);
  const body = {
    isImported: Boolean(payload?.isImported ?? false),
    type: Number(payload?.type ?? 0),
    name: String(payload?.name ?? ""),
    title: String(payload?.title ?? payload?.name ?? ""),
    brand: String(payload?.brand ?? ""),
    email: String(payload?.email ?? ""),
    address: String(payload?.address ?? ""),
  };
  const urls = [
    `${PAZARAMA_BASE}product-commercials`,
    `${PAZARAMA_API_BASE}product-commercials`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama temin şablonu oluşturulamadı");
}

/**
 * Satıcı temin şablonu güncelle
 * PUT product-commercials/id/{id}/product-commercial
 */
export async function pazaramaUpdateProductCommercial(creds, commercialId, payload) {
  const id = String(commercialId ?? "").trim();
  if (!id) throw new Error("commercialId zorunlu");

  const token = await getPazaramaToken(creds);
  const body = {
    isImported: payload?.isImported !== undefined ? Boolean(payload.isImported) : undefined,
    type: payload?.type !== undefined ? Number(payload.type) : undefined,
    name: payload?.name !== undefined ? String(payload.name) : undefined,
    title: payload?.title !== undefined ? String(payload.title) : undefined,
    brand: payload?.brand !== undefined ? String(payload.brand) : undefined,
    email: payload?.email !== undefined ? String(payload.email) : undefined,
    address: payload?.address !== undefined ? String(payload.address) : undefined,
  };
  const clean = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
  const urls = [
    `${PAZARAMA_BASE}product-commercials/id/${id}/product-commercial`,
    `${PAZARAMA_API_BASE}product-commercials/id/${id}/product-commercial`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.put(url.replace(/\/+/g, "/"), clean, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama temin şablonu güncellenemedi");
}

/**
 * Satıcı temin şablonu sil
 * DELETE product-commercials/id/{id}/product-commercial
 */
export async function pazaramaDeleteProductCommercial(creds, commercialId) {
  const id = String(commercialId ?? "").trim();
  if (!id) throw new Error("commercialId zorunlu");

  const token = await getPazaramaToken(creds);
  const urls = [
    `${PAZARAMA_BASE}product-commercials/id/${id}/product-commercial`,
    `${PAZARAMA_API_BASE}product-commercials/id/${id}/product-commercial`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.delete(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama temin şablonu silinemedi");
}

/**
 * Ürün parti/seri no ve son kullanma tarihi güncelle
 * POST product/upsertSellerProductBatchInfo
 * batchNumber, serialNumber: max 25 karakter; expirationDate: ISO tarih
 */
export async function pazaramaUpsertSellerProductBatchInfo(creds, { code, productBatchInfo }) {
  const c = String(code ?? "").trim();
  if (!c) throw new Error("code (barkod) zorunlu");

  const token = await getPazaramaToken(creds);
  const b = productBatchInfo ?? {};
  const body = {
    code: c,
    productBatchInfo: {
      ...(b.batchNumber != null && { batchNumber: String(b.batchNumber).slice(0, 25) }),
      ...(b.serialNumber != null && { serialNumber: String(b.serialNumber).slice(0, 25) }),
      ...(b.expirationDate != null && { expirationDate: b.expirationDate }),
    },
  };
  const urls = [
    `${PAZARAMA_BASE}product/upsertSellerProductBatchInfo`,
    `${PAZARAMA_API_BASE}product/upsertSellerProductBatchInfo`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama parti bilgisi güncellenemedi");
}

/**
 * Ürün güvenlik belgeleri güncelle (kullanım kılavuzu, ön/arka ambalaj)
 * POST product/upsertSellerProductSecurityDocuments
 * type: 1=PDF kılavuz, 2=ön ambalaj (jpeg/png), 3=arka ambalaj (jpeg/png)
 */
export async function pazaramaUpsertSellerProductSecurityDocuments(creds, { code, productSecurityDocument }) {
  const c = String(code ?? "").trim();
  if (!c) throw new Error("code (barkod) zorunlu");

  const docs = Array.isArray(productSecurityDocument) ? productSecurityDocument : [];
  const normalized = docs
    .filter((d) => d?.url && [1, 2, 3].includes(Number(d?.type)))
    .map((d) => ({ url: String(d.url), type: Number(d.type) }));
  if (normalized.length === 0) throw new Error("En az bir geçerli belge (url, type 1/2/3) gerekli");

  const token = await getPazaramaToken(creds);
  const body = { code: c, productSecurityDocument: normalized };
  const urls = [
    `${PAZARAMA_BASE}product/upsertSellerProductSecurityDocuments`,
    `${PAZARAMA_API_BASE}product/upsertSellerProductSecurityDocuments`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama güvenlik belgeleri güncellenemedi");
}

/**
 * Uyarı görseli oluştur (onaya gider)
 * POST product-security-descriptions
 * content + imageUrl (CDN) zorunlu
 */
export async function pazaramaCreateSecurityDescription(creds, { content, imageUrl }) {
  const c = String(content ?? "").trim();
  const img = String(imageUrl ?? "").trim();
  if (!c) throw new Error("content zorunlu");
  if (!img) throw new Error("imageUrl (CDN linki) zorunlu");

  const token = await getPazaramaToken(creds);
  const body = { content: c, imageUrl: img };
  const urls = [
    `${PAZARAMA_BASE}product-security-descriptions`,
    `${PAZARAMA_API_BASE}product-security-descriptions`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama uyarı görseli eklenemedi");
}

/**
 * Onaylanmış uyarı görsellerini listele
 * GET product-security-descriptions/approved?pageIndex=1&pageSize=100
 */
export async function pazaramaGetApprovedSecurityDescriptions(creds, { pageIndex = 1, pageSize = 100 } = {}) {
  const token = await getPazaramaToken(creds);
  const params = new URLSearchParams({
    pageIndex: String(Number(pageIndex) || 1),
    pageSize: String(Number(pageSize) || 100),
  });
  const urls = [
    `${PAZARAMA_BASE}product-security-descriptions/approved?${params}`,
    `${PAZARAMA_API_BASE}product-security-descriptions/approved?${params}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama uyarı görselleri listesi alınamadı");
}

/**
 * Ürüne uyarı görselleri ata (ekle/güncelle/sil)
 * code=barkod, securityDescriptionIds=[] (boş gönderilirse silinir)
 */
export async function pazaramaAssignProductSecurityDescriptions(creds, { code, securityDescriptionIds }) {
  const c = String(code ?? "").trim();
  if (!c) throw new Error("code (barkod) zorunlu");

  const token = await getPazaramaToken(creds);
  const ids = Array.isArray(securityDescriptionIds) ? securityDescriptionIds.map((id) => String(id)).filter(Boolean) : [];
  const body = { code: c, securityDescriptionIds: ids };
  const urls = [
    `${PAZARAMA_BASE}product-security-descriptions/product`,
    `${PAZARAMA_BASE}product-security-descriptions/assign`,
    `${PAZARAMA_API_BASE}product-security-descriptions/product`,
    `${PAZARAMA_API_BASE}product-security-descriptions/assign`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama ürün uyarı görseli güncellenemedi");
}

/**
 * Kataloglu ürün satışa aç/kapat
 * POST product/external-status
 * productStatus: 1 = satışa aç, 10 = satışa kapat
 */
export async function pazaramaSetProductExternalStatus(creds, { code, productStatus }) {
  const c = String(code ?? "").trim();
  if (!c) throw new Error("code (barkod) zorunlu");

  const status = Number(productStatus);
  if (status !== 1 && status !== 10) {
    throw new Error("productStatus 1 (satışa aç) veya 10 (satışa kapat) olmalı");
  }

  const token = await getPazaramaToken(creds);
  const body = { productItem: { code: c, productStatus: status } };
  const urls = [
    `${PAZARAMA_BASE}product/external-status`,
    `${PAZARAMA_API_BASE}product/external-status`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama ürün satış durumu güncellenemedi");
}

/**
 * Kataloglu ürün satışa aç/kapat (toplu)
 * POST product/bulkUpdateProductStatusFromApi
 * productItems: [{ code, productStatus }] - productStatus: 1=satışa aç, 10=satışa kapat
 */
export async function pazaramaBulkUpdateProductStatus(creds, productItems) {
  const items = Array.isArray(productItems) ? productItems : [];
  const normalized = items
    .map((it) => {
      const code = String(it?.code ?? "").trim();
      const status = Number(it?.productStatus);
      if (!code || (status !== 1 && status !== 10)) return null;
      return { code, productStatus: status };
    })
    .filter(Boolean);
  if (normalized.length === 0) throw new Error("En az bir geçerli ürün (code + productStatus 1 veya 10) gerekli");

  const token = await getPazaramaToken(creds);
  const body = { productItems: normalized };
  const urls = [
    `${PAZARAMA_BASE}product/bulkUpdateProductStatusFromApi`,
    `${PAZARAMA_API_BASE}product/bulkUpdateProductStatusFromApi`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 30000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama toplu ürün satış durumu güncellenemedi");
}

/**
 * Ürün kapama-açma toplu işlem sonucu
 * GET listing-state/batch-id/{batchId}/lake-projections?page=1&pageSize=10&lakeType=1
 */
export async function pazaramaGetListingStateBatchResult(creds, batchId, { page = 1, pageSize = 10, lakeType = 1 } = {}) {
  const id = String(batchId ?? "").trim();
  if (!id) throw new Error("batchId zorunlu");

  const token = await getPazaramaToken(creds);
  const params = new URLSearchParams({
    page: String(Number(page) || 1),
    pageSize: String(Number(pageSize) || 10),
    lakeType: String(Number(lakeType) || 1),
  });
  const urls = [
    `${PAZARAMA_BASE}listing-state/batch-id/${encodeURIComponent(id)}/lake-projections?${params}`,
    `${PAZARAMA_API_BASE}listing-state/batch-id/${encodeURIComponent(id)}/lake-projections?${params}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama kapama-açma işlem sonucu alınamadı");
}

/**
 * Toplu KDV oranı güncelleme
 * PUT product/vatRate/bulk
 * listingVatRates: [{ productCode, vatRate }]
 */
export async function pazaramaBulkUpdateVatRate(creds, listingVatRates) {
  const items = Array.isArray(listingVatRates) ? listingVatRates : [];
  const normalized = items
    .map((it) => {
      const code = String(it?.productCode ?? it?.code ?? it?.barcode ?? "").trim();
      const rate = parseInt(it?.vatRate ?? 0, 10);
      if (!code) return null;
      return { productCode: code, vatRate: rate };
    })
    .filter(Boolean);
  if (normalized.length === 0) throw new Error("En az bir ürün (productCode + vatRate) gerekli");

  const token = await getPazaramaToken(creds);
  const body = { listingVatRates: normalized };
  const urls = [
    `${PAZARAMA_BASE}product/vatRate/bulk`,
    `${PAZARAMA_API_BASE}product/vatRate/bulk`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.put(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 30000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama KDV oranı güncellenemedi");
}

/**
 * Fiyat güncelleme (doküman: POST product/updatePrice-v2)
 * items: [{ code, listPrice, salePrice }]
 * Not: %70+ indirimde onay ekibine iletilir
 */
export async function pazaramaUpdatePrice(creds, items) {
  const normalized = items.map((it) => ({
    code: String(it.code ?? it.barcode ?? it.sku ?? "").trim().slice(0, 100),
    listPrice: Number(it.listPrice ?? it.listprice ?? 0),
    salePrice: Number(it.salePrice ?? it.saleprice ?? it.price ?? 0),
  })).filter((it) => it.code && (it.listPrice > 0 || it.salePrice > 0));

  const batches = [];
  for (let i = 0; i < normalized.length; i += PAZARAMA_STOCK_BATCH_SIZE) {
    batches.push(normalized.slice(i, i + PAZARAMA_STOCK_BATCH_SIZE));
  }
  const token = await getPazaramaToken(creds);
  const results = [];
  const urls = [`${PAZARAMA_BASE}product/updatePrice-v2`, `${PAZARAMA_API_BASE}product/updatePrice-v2`];
  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await waitRateLimit(creds.apiKey);
    const payload = { items: batches[i] };
    let data;
    let lastErr;
    for (const url of urls) {
      try {
        const res = await axios.post(url.replace(/\/+/g, "/"), payload, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          timeout: 30000,
        });
        data = res.data;
        break;
      } catch (err) {
        lastErr = err;
        if (err.response?.status !== 404) throw err;
      }
    }
    results.push(data ?? { success: false, message: lastErr?.message });
  }
  return results[results.length - 1] ?? results;
}

/**
 * Stok güncelleme (doküman: POST product/updateStock-v2)
 * items: [{ code, stockCount }]
 */
export async function pazaramaUpdateStock(creds, items) {
  const normalized = items.map((it) => ({
    code: String(it.code ?? it.barcode ?? it.sku ?? "").trim().slice(0, 100),
    stockCount: Math.max(0, parseInt(it.stockCount ?? it.stock ?? 0, 10)),
  })).filter((it) => it.code);

  const batches = [];
  for (let i = 0; i < normalized.length; i += PAZARAMA_STOCK_BATCH_SIZE) {
    batches.push(normalized.slice(i, i + PAZARAMA_STOCK_BATCH_SIZE));
  }
  const token = await getPazaramaToken(creds);
  const results = [];
  const urls = [`${PAZARAMA_BASE}product/updateStock-v2`, `${PAZARAMA_API_BASE}product/updateStock-v2`];
  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await waitRateLimit(creds.apiKey);
    const payload = { items: batches[i] };
    let data;
    let lastErr;
    for (const url of urls) {
      try {
        const res = await axios.post(url.replace(/\/+/g, "/"), payload, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          timeout: 30000,
        });
        data = res.data;
        break;
      } catch (err) {
        lastErr = err;
        if (err.response?.status !== 404) throw err;
      }
    }
    results.push(data ?? { success: false, message: lastErr?.message });
  }
  return results[results.length - 1] ?? results;
}

/**
 * Max satış stok adedi güncelle (siparişte max alınabilecek adet)
 * POST product/upsertSellerProductSaleLimit
 * code + Quantity (0 = sınırsız / boş)
 */
export async function pazaramaUpsertSellerProductSaleLimit(creds, { code, Quantity }) {
  const c = String(code ?? "").trim();
  if (!c) throw new Error("code (barkod) zorunlu");

  const token = await getPazaramaToken(creds);
  const qty = Quantity != null ? Math.max(0, parseInt(Quantity, 10)) : 0;
  const body = { code: c, Quantity: qty };
  const urls = [
    `${PAZARAMA_BASE}product/upsertSellerProductSaleLimit`,
    `${PAZARAMA_API_BASE}product/upsertSellerProductSaleLimit`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama max satış stok adedi güncellenemedi");
}

/**
 * Fiyat/Stok update sonucu (dataId ile sorgu)
 * GET listing-state/batch-id/{dataId}/lake-projections?page=1&pageSize=3000
 * updatePrice-v2 / updateStock-v2 cevabındaki data değeri dataId olarak kullanılır
 */
export async function pazaramaGetListingBatchResult(creds, dataId, page = 1, pageSize = 3000) {
  const token = await getPazaramaToken(creds);
  const path = `listing-state/batch-id/${encodeURIComponent(dataId)}/lake-projections`;
  const qs = `page=${page}&pageSize=${pageSize}`;
  const urls = [
    `${PAZARAMA_BASE}${path}?${qs}`,
    `${PAZARAMA_API_BASE}${path}?${qs}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama listing batch sonucu alınamadı");
}

/** Teslimat tipi */
export const PAZARAMA_DELIVERY_TYPE = {
  1: "Kargo",
  2: "Kurye",
  3: "Mağaza",
  4: "Dijital",
  5: "Bağış",
  10001: "Teslimat Noktası",
};

/** Fatura tipi */
export const PAZARAMA_INVOICE_TYPE = {
  1: "Bireysel",
  2: "Kurumsal",
};

/** Sipariş / sipariş kalemi statüsü */
export const PAZARAMA_ORDER_ITEM_STATUS = {
  3: "Siparişiniz Alındı",
  5: "Siparişiniz Kargoya Verildi",
  6: "Siparişiniz İptal Edildi",
  7: "İade Süreci Başlatıldı",
  8: "İade Onaylandı",
  9: "İade Reddedildi",
  10: "İade Edildi",
  11: "Teslim Edildi",
  12: "Siparişiniz Hazırlanıyor",
  13: "Tedarik Edilemedi",
  14: "Teslim Edilemedi",
  16: "Siparişiniz Mağazada",
  18: "İptal Süreci Başlatıldı",
  19: "Siparişiniz Teslimat Noktasında",
};

/** Ödeme tipi */
export const PAZARAMA_PAYMENT_TYPE = {
  1: "Banka/Kredi Kartı",
  5: "Cüzdan",
  8: "Visa Tek Tıkla Öde",
  11: "Taksitli Ek Hesap",
};

/**
 * Sipariş listesi
 * POST order/getOrdersForApi
 * - Paging: pageSize, pageNumber, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * - Sipariş no ile: orderNumber, startDate (YYYY-MM-DDTHH:mm), endDate (max 6 ay)
 * - orderItemStatus: statüye göre filtre (opsiyonel)
 * NOT: Başlangıç-bitiriş arası max 1 ay. EndDate o günü kapsamaz. DeliveryType: 1=Kargo, 2=Kurye, 3=Mağaza, 4=Dijital, 5=Bağış, 10001=Teslimat Noktası
 */
export async function pazaramaGetOrders(creds, startDate, endDate, page = 1, size = 100, orderNumber = null, orderItemStatus = null) {
  const token = await getPazaramaToken(creds);
  const body = {};

  if (orderNumber != null && orderNumber !== "") {
    body.orderNumber = Number(orderNumber);
    body.startDate = String(startDate || "").slice(0, 16);
    body.endDate = String(endDate || "").slice(0, 16);
  } else {
    body.pageSize = Number(size) || 100;
    body.pageNumber = Number(page) || 1;
    body.startDate = String(startDate || "").slice(0, 10);
    body.endDate = String(endDate || "").slice(0, 10);
  }
  if (orderItemStatus != null && orderItemStatus !== "") {
    body.orderItemStatus = Number(orderItemStatus);
  }

  const urls = [
    `${PAZARAMA_BASE}order/getOrdersForApi`,
    `${PAZARAMA_API_BASE}order/getOrdersForApi`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama sipariş listesi alınamadı");
}

/**
 * Sipariş listesi V2 (parçalı sipariş: aynı ürün quantity>1 ise her biri ayrı orderItemId, quantity=1)
 * POST order/getOrdersForApiV2
 * Parametreler getOrdersForApi ile aynı. NOT: Tarih aralığı max 1 ay.
 */
export async function pazaramaGetOrdersV2(creds, startDate, endDate, page = 1, size = 100, orderNumber = null, orderItemStatus = null) {
  const token = await getPazaramaToken(creds);
  const body = {};
  if (orderNumber != null && orderNumber !== "") {
    body.orderNumber = Number(orderNumber);
    body.startDate = String(startDate || "").slice(0, 16);
    body.endDate = String(endDate || "").slice(0, 16);
  } else {
    body.pageSize = Number(size) || 100;
    body.pageNumber = Number(page) || 1;
    body.startDate = String(startDate || "").slice(0, 10);
    body.endDate = String(endDate || "").slice(0, 10);
  }
  if (orderItemStatus != null && orderItemStatus !== "") {
    body.orderItemStatus = Number(orderItemStatus);
  }
  const urls = [
    `${PAZARAMA_BASE}order/getOrdersForApiV2`,
    `${PAZARAMA_API_BASE}order/getOrdersForApiV2`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama sipariş listesi V2 alınamadı");
}

/**
 * Kargo takip durumu bildir (kargoya verildi vb.)
 * PUT order/updateOrderStatus
 * orderNumber + item: { orderItemId, status, deliveryType, shippingTrackingNumber, trackingUrl?, cargoCompanyId }
 * status: 5 = Kargoya Verildi
 */
export async function pazaramaUpdateOrderCargoStatus(creds, { orderNumber, item }) {
  const num = orderNumber != null ? Number(orderNumber) : null;
  if (!num || isNaN(num)) throw new Error("orderNumber zorunlu");
  const it = item && typeof item === "object" ? item : null;
  if (!it?.orderItemId) throw new Error("item.orderItemId zorunlu");
  if (it.status == null || it.status === "") throw new Error("item.status zorunlu");
  if (!it.shippingTrackingNumber && !it.trackingnumber) throw new Error("item.shippingTrackingNumber veya trackingnumber zorunlu");
  if (!it.cargoCompanyId) throw new Error("item.cargoCompanyId zorunlu");

  const token = await getPazaramaToken(creds);
  const body = {
    orderNumber: num,
    item: {
      orderItemId: String(it.orderItemId),
      status: Number(it.status),
      deliveryType: Number(it.deliveryType ?? 1),
      shippingTrackingNumber: String(it.shippingTrackingNumber ?? it.trackingnumber ?? ""),
      cargoCompanyId: String(it.cargoCompanyId),
      ...(it.trackingUrl != null && { trackingUrl: String(it.trackingUrl) }),
    },
  };
  const urls = [
    `${PAZARAMA_BASE}order/updateOrderStatus`,
    `${PAZARAMA_API_BASE}order/updateOrderStatus`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.put(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama kargo takip durumu güncellenemedi");
}

/**
 * Sipariş ürün durumu (OrderItem) güncelle
 * PUT order/updateOrderStatus
 * orderNumber + item: { orderItemId, status }
 * status: 3=Sipariş Alındı, 12=Hazırlanıyor, 5=Kargoya Verildi, 11=Teslim Edildi, 13=Tedarik Edilemedi, 14=Teslim Edilemedi
 */
export async function pazaramaUpdateOrderItemStatus(creds, { orderNumber, item }) {
  const num = orderNumber != null ? Number(orderNumber) : null;
  if (!num || isNaN(num)) throw new Error("orderNumber zorunlu");
  const it = item && typeof item === "object" ? item : null;
  if (!it?.orderItemId) throw new Error("item.orderItemId zorunlu");
  if (it.status == null || it.status === "") throw new Error("item.status zorunlu");

  const token = await getPazaramaToken(creds);
  const body = {
    orderNumber: num,
    item: {
      orderItemId: String(it.orderItemId),
      status: Number(it.status),
    },
  };
  const urls = [
    `${PAZARAMA_BASE}order/updateOrderStatus`,
    `${PAZARAMA_API_BASE}order/updateOrderStatus`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.put(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama sipariş ürün durumu güncellenemedi");
}

/**
 * Toplu sipariş durumu güncelle (siparişteki tüm ürünlere aynı statü)
 * PUT order/updateOrderStatusList
 * orderNumber + status
 */
export async function pazaramaUpdateOrderStatusList(creds, { orderNumber, status }) {
  const num = orderNumber != null ? Number(orderNumber) : null;
  if (!num || isNaN(num)) throw new Error("orderNumber zorunlu");
  if (status == null || status === "") throw new Error("status zorunlu");

  const token = await getPazaramaToken(creds);
  const body = { orderNumber: num, status: Number(status) };
  const urls = [
    `${PAZARAMA_BASE}order/updateOrderStatusList`,
    `${PAZARAMA_API_BASE}order/updateOrderStatusList`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.put(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama toplu sipariş durumu güncellenemedi");
}

/**
 * Birden fazla order item statüsünü tek istekte güncelle
 * POST order/api/bulk-status-update
 * orderNumber + orderItemIds[] + updateShipmentDto
 * Teslim edildi (11) için sadece status, diğerleri null. Kargo için cargoCompanyId, shippingTrackingNumber vb.
 */
export async function pazaramaBulkUpdateOrderItemStatus(creds, { orderNumber, orderItemIds, updateShipmentDto }) {
  const num = orderNumber != null ? Number(orderNumber) : null;
  if (!num || isNaN(num)) throw new Error("orderNumber zorunlu");
  const ids = Array.isArray(orderItemIds) ? orderItemIds.map((id) => String(id)).filter(Boolean) : [];
  if (ids.length === 0) throw new Error("orderItemIds zorunlu (en az bir id)");
  const dto = updateShipmentDto && typeof updateShipmentDto === "object" ? updateShipmentDto : {};
  if (dto.status == null || dto.status === "") throw new Error("updateShipmentDto.status zorunlu");

  const token = await getPazaramaToken(creds);
  const body = {
    orderNumber: num,
    orderItemIds: ids,
    updateShipmentDto: {
      status: Number(dto.status),
      deliveryType: dto.deliveryType != null ? Number(dto.deliveryType) : 1,
      subStatus: dto.subStatus != null ? Number(dto.subStatus) : 0,
      cargoCompanyId: dto.cargoCompanyId ?? null,
      shipmentNumber: dto.shipmentNumber ?? null,
      shippingTrackingNumber: dto.shippingTrackingNumber ?? null,
      trackingUrl: dto.trackingUrl ?? null,
    },
  };
  const urls = [
    `${PAZARAMA_BASE}order/api/bulk-status-update`,
    `${PAZARAMA_API_BASE}order/api/bulk-status-update`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama bulk sipariş item statüsü güncellenemedi");
}

/**
 * Sipariş paket bölme (farklı depo/adresten gönderim)
 * PUT order/api/delivery/split
 * orderId, shipmentCode, sellerAddressId, cargoCompanyId, items: [{ orderItemId, quantity }]
 */
export async function pazaramaDeliverySplit(creds, { orderId, shipmentCode, sellerAddressId, cargoCompanyId, items }) {
  const oid = String(orderId ?? "").trim();
  const sc = String(shipmentCode ?? "").trim();
  const said = String(sellerAddressId ?? "").trim();
  const cid = String(cargoCompanyId ?? "").trim();
  if (!oid) throw new Error("orderId zorunlu");
  if (!sc) throw new Error("shipmentCode zorunlu");
  if (!said) throw new Error("sellerAddressId zorunlu");
  if (!cid) throw new Error("cargoCompanyId zorunlu");

  const itemsArr = Array.isArray(items) ? items : [];
  const normalized = itemsArr
    .map((it) => {
      const oiid = it?.orderItemId;
      const q = parseInt(it?.quantity ?? 1, 10);
      if (!oiid) return null;
      return { orderItemId: String(oiid), quantity: Math.max(1, q) };
    })
    .filter(Boolean);
  if (normalized.length === 0) throw new Error("items dizisi zorunlu (en az bir orderItemId)");

  const token = await getPazaramaToken(creds);
  const body = {
    orderId: oid,
    shipmentCode: sc,
    sellerAddressId: said,
    cargoCompanyId: cid,
    items: normalized,
  };
  const urls = [
    `${PAZARAMA_BASE}order/api/delivery/split`,
    `${PAZARAMA_API_BASE}order/api/delivery/split`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.put(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama paket bölme başarısız");
}

/**
 * Paketten vazgeç (bölünmüş paketleri birleştir)
 * PUT order/api/delivery/cancel
 * orderId, shipmentCode
 */
export async function pazaramaDeliveryCancel(creds, { orderId, shipmentCode }) {
  const oid = String(orderId ?? "").trim();
  const sc = String(shipmentCode ?? "").trim();
  if (!oid) throw new Error("orderId zorunlu");
  if (!sc) throw new Error("shipmentCode zorunlu");

  const token = await getPazaramaToken(creds);
  const body = { orderId: oid, shipmentCode: sc };
  const urls = [
    `${PAZARAMA_BASE}order/api/delivery/cancel`,
    `${PAZARAMA_API_BASE}order/api/delivery/cancel`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.put(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama paketten vazgeçme başarısız");
}

/**
 * İptal talebi statü güncelleme
 * PUT order/api/cancel
 * body: { refundId, status }
 * Firmalar sadece status 2 (Onay) veya 3 (Red) ile güncelleme yapabilir
 */
export async function pazaramaUpdateCancelStatus(creds, { refundId, status }) {
  const rid = String(refundId ?? "").trim();
  const st = Number(status);
  if (!rid) throw new Error("refundId zorunlu");
  if (st !== 2 && st !== 3) {
    throw new Error("Firmalar sadece status 2 (Onay) veya 3 (Red) ile güncelleme yapabilir");
  }

  const token = await getPazaramaToken(creds);
  const body = { refundId: rid, status: st };
  const urls = [
    `${PAZARAMA_BASE}order/api/cancel`,
    `${PAZARAMA_API_BASE}order/api/cancel`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.put(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama iptal statüsü güncellenemedi");
}

/** İptal talebi statü kodları (order/api/cancel) */
export const PAZARAMA_CANCEL_STATUS = {
  1: "Onay Bekliyor",
  2: "Tedarikçi Tarafından Onaylandı",
  3: "Tedarikçi Tarafından Reddedildi",
  4: "Backoffice Tarafından Onaylandı",
  5: "Backoffice Tarafından Reddedildi",
  6: "Auto Approved",
  7: "Talep İptal Edildi",
  8: "Direkt Onay",
};

/**
 * İptal taleplerini sorgula
 * POST order/api/cancel/items
 * body: pageSize, pageNumber, refundStatus, requestStartDate, requestEndDate, orderNumber
 */
export async function pazaramaGetCancelItems(creds, params = {}) {
  const token = await getPazaramaToken(creds);
  const body = {
    pageSize: Number(params.pageSize) || 10,
    pageNumber: Number(params.pageNumber) || 1,
    refundStatus: params.refundStatus ?? null,
    requestStartDate: params.requestStartDate ?? null,
    requestEndDate: params.requestEndDate ?? null,
    orderNumber: params.orderNumber ?? null,
  };
  const urls = [
    `${PAZARAMA_BASE}order/api/cancel/items`,
    `${PAZARAMA_API_BASE}order/api/cancel/items`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama iptal talepleri alınamadı");
}

/** Paket statüleri: NONE=0, PACKED=10, UNPACKED=20, UNPACKED_NOTSUPPLY=30, UNPACKED_CANCELLED=40 */
export const PAZARAMA_PACKAGE_STATUS = {
  0: "NONE",
  10: "PACKED",
  20: "UNPACKED",
  30: "UNPACKED_NOTSUPPLY",
  40: "UNPACKED_CANCELLED",
};

/**
 * Sipariş kargo paketlerini listele
 * GET order/api/shipment-packages?orderId=...
 */
export async function pazaramaGetShipmentPackages(creds, orderId) {
  const oid = String(orderId ?? "").trim();
  if (!oid) throw new Error("orderId zorunlu");

  const token = await getPazaramaToken(creds);
  const params = new URLSearchParams({ orderId: oid });
  const urls = [
    `${PAZARAMA_BASE}order/api/shipment-packages?${params}`,
    `${PAZARAMA_API_BASE}order/api/shipment-packages?${params}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama paket listesi alınamadı");
}

/**
 * Paket oluştur / böl (packages-split)
 * POST order/api/packages-split
 * apiOrderItemPackages: [{ orderItemIds, sellerAddressId?, cargoCompanyId }]
 * sellerAddressId boş = varsayılan depo
 */
export async function pazaramaPostPackagesSplit(creds, { orderId, sellerId, apiOrderItemPackages }) {
  const oid = String(orderId ?? "").trim();
  if (!oid) throw new Error("orderId zorunlu");

  const pkg = Array.isArray(apiOrderItemPackages) ? apiOrderItemPackages : [];
  const normalized = pkg
    .map((p) => {
      const ids = Array.isArray(p?.orderItemIds) ? p.orderItemIds.map((id) => String(id)).filter(Boolean) : [];
      if (ids.length === 0) return null;
      return {
        orderItemIds: ids,
        sellerAddressId: p?.sellerAddressId ? String(p.sellerAddressId) : null,
        cargoCompanyId: p?.cargoCompanyId ? String(p.cargoCompanyId) : null,
      };
    })
    .filter(Boolean);
  if (normalized.length === 0) throw new Error("apiOrderItemPackages zorunlu (en az bir paket)");

  const token = await getPazaramaToken(creds);
  const body = {
    orderId: oid,
    ...(sellerId && { sellerId: String(sellerId) }),
    apiOrderItemPackages: normalized,
  };
  const urls = [
    `${PAZARAMA_BASE}order/api/packages-split`,
    `${PAZARAMA_API_BASE}order/api/packages-split`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama paket bölme başarısız");
}

/**
 * Paket güncelle (satıcı adresi / kargo firması)
 * PUT order/update-packages
 * packages: [{ packageNumber, cargoCompanyId?, sellerAddressId? }]
 */
export async function pazaramaUpdatePackages(creds, packages) {
  const pkgs = Array.isArray(packages) ? packages : [];
  const normalized = pkgs
    .map((p) => {
      const pn = p?.packageNumber;
      if (pn == null && pn !== 0) return null;
      const obj = { packageNumber: Number(pn) || pn };
      if (p?.cargoCompanyId != null) obj.cargoCompanyId = String(p.cargoCompanyId);
      if (p?.sellerAddressId != null) obj.sellerAddressId = String(p.sellerAddressId);
      return obj;
    })
    .filter((p) => p && (p.packageNumber != null || p.packageNumber === 0));
  if (normalized.length === 0) throw new Error("packages zorunlu (en az bir paket)");

  const token = await getPazaramaToken(creds);
  const body = { packages: normalized };
  const urls = [
    `${PAZARAMA_BASE}order/update-packages`,
    `${PAZARAMA_API_BASE}order/update-packages`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.put(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama paket güncelleme başarısız");
}

/**
 * Fatura linki güncelleme
 * deliveryCompanyId ve trackingNumber null → siparişteki tüm ürünlere fatura
 * değer gönderilirse → ilgili paketteki ürünlere fatura
 * @param {object} creds - { apiKey, apiSecret }
 * @param {string} orderId - Sipariş ID (UUID)
 * @param {string} invoiceLink - Fatura PDF URL
 * @param {string|null} [deliveryCompanyId] - null = tüm sipariş; UUID = paket bazlı
 * @param {string|null} [trackingNumber] - Paket takip no (paket bazlı kullanımda)
 */
export async function pazaramaUpdateInvoiceLink(creds, orderId, invoiceLink, deliveryCompanyId = null, trackingNumber = null) {
  const token = await getPazaramaToken(creds);
  const body = {
    invoiceLink: String(invoiceLink).trim(),
    orderid: String(orderId).trim(),
    deliveryCompanyId: deliveryCompanyId ?? null,
    trackingNumber: trackingNumber ?? null,
  };
  const urls = [
    `${PAZARAMA_BASE}order/invoice-link`,
    `${PAZARAMA_API_BASE}order/invoice-link`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama fatura linki güncellenemedi");
}

/**
 * İtem bazlı fatura linki (birden fazla ürüne)
 * POST order/multiple-invoice-link
 * orderId, invoiceLink, orderItemIds[], deliveryCompanyId?, trackingNumber?
 */
export async function pazaramaUpdateMultipleInvoiceLink(creds, { orderId, invoiceLink, orderItemIds, deliveryCompanyId = null, trackingNumber = null }) {
  const oid = String(orderId ?? "").trim();
  const link = String(invoiceLink ?? "").trim();
  const ids = Array.isArray(orderItemIds) ? orderItemIds.map((id) => String(id)).filter(Boolean) : [];
  if (!oid) throw new Error("orderId zorunlu");
  if (!link) throw new Error("invoiceLink zorunlu");
  if (ids.length === 0) throw new Error("orderItemIds zorunlu (en az bir id)");

  const token = await getPazaramaToken(creds);
  const body = {
    orderId: oid,
    invoiceLink: link,
    orderItemIds: ids,
    deliveryCompanyId: deliveryCompanyId ?? null,
    trackingNumber: trackingNumber ?? null,
  };
  const urls = [
    `${PAZARAMA_BASE}order/multiple-invoice-link`,
    `${PAZARAMA_API_BASE}order/multiple-invoice-link`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama item bazlı fatura linki güncellenemedi");
}

/**
 * İadeler (refund listesi)
 * Parametreler: pageSize, pageNumber, refundStatus, requestStartDate, requestEndDate
 * Tarih: YYYY-MM-DD veya YYYY-MM-DDTHH:mm (saat/dakika ile)
 * SplitItems: true = her adet ayrı refundId, quantity=1; false = mevcut yapı
 */
export async function pazaramaGetRefunds(creds, startDate, endDate, page = 1, size = 100, refundStatus = null, splitItems = null) {
  const token = await getPazaramaToken(creds);
  const start = String(startDate || "");
  const end = String(endDate || "");
  const maxLen = (s) => (s.includes("T") || s.length > 10 ? 16 : 10);
  const body = {
    pageSize: Number(size) || 100,
    pageNumber: Number(page) || 1,
    requestStartDate: start.slice(0, maxLen(start)),
    requestEndDate: end.slice(0, maxLen(end)),
  };
  if (refundStatus != null) body.refundStatus = Number(refundStatus);
  if (splitItems === true || splitItems === false) body.SplitItems = splitItems;

  const res = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  return res.data;
}

/**
 * Teslimat tipleri görüntüleme (kargo, kurye, mağazadan teslimat)
 * GET sellerRegister/getSellerDelivery
 */
export async function pazaramaGetSellerDelivery(creds) {
  const token = await getPazaramaToken(creds);
  const urls = [
    `${PAZARAMA_BASE}sellerRegister/getSellerDelivery`,
    `${PAZARAMA_API_BASE}sellerRegister/getSellerDelivery`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.get(url.replace(/\/+/g, "/"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama teslimat tipleri alınamadı");
}

/**
 * Muhasebe / Finans - ödeme anlaşması (satış, iade, komisyon)
 * Body: startDate, endDate, allowanceDate (opsiyonel), orderId (opsiyonel)
 */
export async function pazaramaGetPaymentAgreement(creds, startDate, endDate, allowanceDate = null, orderId = null) {
  const token = await getPazaramaToken(creds);
  const url = `${PAZARAMA_BASE}order/paymentAgreement`;
  const body = {
    startDate: typeof startDate === "string" && startDate.length === 10 ? `${startDate}T00:00:01.000Z` : startDate,
    endDate: typeof endDate === "string" && endDate.length === 10 ? `${endDate}T23:59:59.000Z` : endDate,
    allowanceDate: allowanceDate || null,
    orderId: orderId || null,
  };

  const res = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  return res.data;
}

/**
 * İade statüsü güncelleme (Onay/Red/İncelemeye Gönder)
 * POST order/updateRefund
 * status: 2=Onayla, 3=Reddet, 9=İncelemeye Gönder
 * status=3: RefundRejectType zorunlu, description zorunlu, documentObjects (10-11 hariç zorunlu)
 * status=9: RefundReviewType zorunlu, description zorunlu
 */
export async function pazaramaUpdateRefundStatus(creds, refundId, status, refundRejectType = null, opts = {}) {
  const rid = String(refundId ?? "").trim();
  const st = Number(status);
  if (!rid) throw new Error("refundId zorunlu");
  if (st !== 2 && st !== 3 && st !== 9) {
    throw new Error("status 2 (Onayla), 3 (Reddet) veya 9 (İncelemeye Gönder) olabilir");
  }
  if (st === 3 && (refundRejectType == null || refundRejectType === "")) {
    throw new Error("status 3 için RefundRejectType zorunlu");
  }
  if (st === 9 && (opts.refundReviewType == null && opts.RefundReviewType == null)) {
    throw new Error("status 9 için refundReviewType zorunlu (1-3)");
  }
  if ((st === 3 || st === 9) && (!opts.description || !String(opts.description).trim())) {
    throw new Error("status 3 ve 9 için description zorunlu");
  }

  const token = await getPazaramaToken(creds);
  const body = { refundId: rid, status: st };
  if (st === 3) {
    body.refundRejectType = Number(refundRejectType);
    if (opts.description != null) body.description = String(opts.description);
    const docs = Array.isArray(opts.documentObjects) ? opts.documentObjects : [];
    if (docs.length > 0) body.documentObjects = docs.filter((d) => d?.name != null).map((d) => ({ name: String(d.name), bytes: d?.bytes != null ? String(d.bytes) : "" }));
  }
  if (st === 9) {
    body.refundReviewType = Number(opts.refundReviewType ?? opts.RefundReviewType);
    if (opts.description != null) body.description = String(opts.description);
    const docs = Array.isArray(opts.documentObjects) ? opts.documentObjects : [];
    if (docs.length > 0) body.documentObjects = docs.filter((d) => d?.name != null).map((d) => ({ name: String(d.name), bytes: d?.bytes != null ? String(d.bytes) : "" }));
    if (opts.quantity != null) body.quantity = Number(opts.quantity);
  }

  const urls = [
    `${PAZARAMA_BASE}order/updateRefund`,
    `${PAZARAMA_API_BASE}order/updateRefund`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama iade statüsü güncellenemedi");
}

/**
 * İade revizyon (Pazarama'nın ek veri talep ettiği durumda)
 * POST order/api/refund/revision
 * refundId, description (zorunlu), documentObjects: [{ name, bytes }] (opsiyonel)
 */
export async function pazaramaRefundRevision(creds, { refundId, description, documentObjects }) {
  const rid = String(refundId ?? "").trim();
  const desc = description != null ? String(description) : "";
  if (!rid) throw new Error("refundId zorunlu");
  if (!desc.trim()) throw new Error("description zorunlu");

  const token = await getPazaramaToken(creds);
  const body = { refundId: rid, description: desc };
  const docs = Array.isArray(documentObjects) ? documentObjects : [];
  if (docs.length > 0) {
    body.documentObjects = docs
      .filter((d) => d?.name != null)
      .map((d) => ({ name: String(d.name), bytes: d?.bytes != null ? String(d.bytes) : "" }));
  }

  const urls = [
    `${PAZARAMA_BASE}order/api/refund/revision`,
    `${PAZARAMA_API_BASE}order/api/refund/revision`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axios.post(url.replace(/\/+/g, "/"), body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 404) throw err;
    }
  }
  throw lastErr || new Error("Pazarama iade revizyonu gönderilemedi");
}

/** İnceleme tipi (status=9 İncelemeye Gönder için zorunlu) */
export const PAZARAMA_REFUND_REVIEW_TYPE = {
  1: "Üretici firma incelemesi",
  2: "Yetkili servis incelemesi",
  3: "Diğer",
};

/** İade red nedeni (status=3 için zorunlu) */
export const PAZARAMA_REFUND_REJECT_TYPE = {
  1: "Gelen ürün bana ait değil",
  2: "Gelen ürün defolu/zarar görmüş",
  3: "Gelen ürün adedi eksik",
  4: "Gelen ürün yanlış",
  5: "Gelen ürün kullanılmış",
  6: "Gelen ürün sahte",
  7: "Gelen ürünün parçası/aksesuarı eksik",
  8: "Gönderdiğim ürün kusurlu değil",
  9: "Gönderdiğim ürün yanlış değil",
  10: "İade paketi boş geldi",
  11: "İade paketi elime ulaşmadı",
  12: "Diğer",
};

/** İade statü kodları */
export const PAZARAMA_REFUND_STATUS = {
  1: "Onay Bekliyor",
  2: "Tedarikçi Tarafından Onaylandı",
  3: "Tedarikçi Tarafından Reddedildi",
  4: "Backoffice Tarafından Onaylandı",
  5: "Backoffice Tarafından Reddedildi",
  6: "Auto Approved",
  7: "Talep İptal Edildi",
  8: "Direkt Onay",
};

/** Sipariş statü etiketleri */
export const PAZARAMA_ORDER_STATUS = {
  3: "Sipariş Alındı",
  5: "Kargoya Verildi",
  6: "İptal Edildi",
  7: "İade Süreci Başlatıldı",
  8: "İade Onaylandı",
  9: "İade Reddedildi",
  10: "İade Edildi",
  11: "Teslim Edildi",
  12: "Hazırlanıyor",
  13: "Tedarik Edilemedi",
  14: "Teslim Edilemedi",
  16: "Mağazada",
  18: "İptal Süreci Başlatıldı",
  19: "Teslimat Noktasında",
};
