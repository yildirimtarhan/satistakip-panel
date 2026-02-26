import axios from "axios";
import dbConnect from "@/lib/dbConnect";
import Settings from "@/models/Settings";
const soap = require('soap');

/* ======================================================
   SETTINGS RESOLVER (DB -> ENV fallback)
====================================================== */
export async function getN11SettingsFromDB({ companyId, userId }) {
  await dbConnect();

  let settings = null;
  if (companyId) settings = await Settings.findOne({ companyId });
  if (!settings && userId) settings = await Settings.findOne({ userId });

  const n11 = settings?.n11 || {};
  const appKey = n11.appKey || process.env.N11_APP_KEY;
  const appSecret = n11.appSecret || process.env.N11_SECRET;

  if (!appKey || !appSecret) {
    throw new Error("N11 appKey/appSecret bulunamadı");
  }

  return {
    appKey,
    appSecret,
    integrator: n11.integrator || process.env.N11_INTEGRATOR || "SatisTakip",
    environment: n11.environment || process.env.N11_ENV || "production",
  };
}

/* ======================================================
   REST HEADERS
====================================================== */
function n11Headers(cfg) {
  return {
    "Content-Type": "application/json",
    appkey: cfg.appKey,
    appsecret: cfg.appSecret,
  };
}

/* ======================================================
   ÜRÜN OLUŞTUR (REST)
====================================================== */
export async function n11CreateProduct(req, product, n11Override = {}) {
  let decoded;
  try {
    const jwt = require("jsonwebtoken");
    const token = req.headers.authorization?.replace("Bearer ", "");
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new Error("Token geçersiz");
  }

  const cfg = await getN11SettingsFromDB({
    companyId: decoded?.companyId,
    userId: decoded?.userId || decoded?.id || decoded?._id,
  });

  const title = product.name || product.title || product.ad;
  const stockCode = product.sku || product.barcode || product.barkod || String(product._id);
  const salePrice = Number(product.price || product.priceTl || product.salePrice || 0);
  const listPrice = Number(product.listPrice || product.priceTlList || (salePrice * 1.1).toFixed(2));
  const stock = Number(product.stock ?? product.quantity ?? 0);
  const description = n11Override.description || product.description || product.aciklama || title;
  const categoryId = n11Override.categoryId || product.marketplaceSettings?.n11?.categoryId || product.n11CategoryId || product.categoryId;
  const shipmentTemplate = n11Override.shipmentTemplate || product.shipmentTemplate || null;
  const preparingDay = Number(n11Override.preparingDay ?? product.preparingDay ?? 3);
  const vatRate = Number(n11Override.vatRate ?? product.vatRate ?? 20);
  const attributes = n11Override.attributes?.length ? n11Override.attributes : product.marketplaceSettings?.n11?.attributes?.length ? product.marketplaceSettings.n11.attributes : product.n11Attributes?.length ? product.n11Attributes : [];

  if (!title) throw new Error("Ürün başlığı zorunlu");
  if (!categoryId) throw new Error("N11 kategori ID zorunlu");

  const payload = {
    integrator: cfg.integrator,
    skus: [{
      stockCode,
      title,
      description,
      categoryId: Number(categoryId),
      ...(product.barcode || product.barkod ? { barcode: String(product.barcode || product.barkod) } : {}),
      listPrice: Math.max(listPrice, salePrice + 0.01),
      salePrice,
      quantity: stock,
      currencyType: product.currencyType || "TL",
      preparingDay,
      ...(shipmentTemplate ? { shipmentTemplate } : {}),
      vatRate,
      ...(product.images?.length ? { images: product.images.slice(0, 8).map((img, i) => ({ url: typeof img === "string" ? img : img?.url, order: i + 1 })).filter((i) => i.url) } : {}),
      ...(product.marketplaceSettings?.n11?.brandId ? { brandId: Number(product.marketplaceSettings.n11.brandId) } : product.n11BrandId ? { brandId: Number(product.n11BrandId) } : {}),
      ...(attributes.length ? { attributes } : {}),
    }],
  };

  let response;
  try {
    response = await axios.post(
      "https://api.n11.com/ms/product/tasks/product-create",
      { payload },
      { headers: n11Headers(cfg), timeout: 20000 }
    );
  } catch (axiosErr) {
    const errBody = axiosErr?.response?.data;
    const msg = errBody?.message || errBody?.error || errBody?.description || JSON.stringify(errBody) || axiosErr.message;
    throw new Error(`N11 API Hatası (${axiosErr?.response?.status}): ${msg}`);
  }

  const taskId = response.data?.id || response.data?.taskId;
  const status = response.data?.status || "IN_QUEUE";

  return {
    success: true,
    taskId,
    status,
    message: response.data?.reasons?.[0] || "N11'e gönderildi",
    raw: response.data,
  };
}

/* ======================================================
   TASK STATUS SORGU (REST)
====================================================== */
export async function n11GetTaskStatus({ companyId, userId, taskId }) {
  if (!taskId) throw new Error("taskId zorunlu");

  const cfg = await getN11SettingsFromDB({ companyId, userId });

  const response = await axios.post(
    "https://api.n11.com/ms/product/task-details/page-query",
    { taskId: Number(taskId), pageable: { page: 0, size: 100 } },
    { headers: n11Headers(cfg), timeout: 15000 }
  );

  const data = response.data;
  const taskRawStatus = String(data?.status || "IN_QUEUE").toUpperCase();
  const firstSku = data?.skus?.content?.[0];
  const skuStatus = String(firstSku?.status || "").toUpperCase();

  let status = "IN_QUEUE";
  if (["PROCESSED", "COMPLETED", "SUCCESS", "DONE"].includes(taskRawStatus)) {
    if (["FAIL", "FAILED", "REJECT", "ERROR"].includes(skuStatus)) {
      status = "FAILED";
    } else if (["SUCCESS", "COMPLETED", "DONE", "PROCESSED"].includes(skuStatus)) {
      status = "COMPLETED";
    } else {
      const reasons = firstSku?.sku?.reasons || firstSku?.reasons || [];
      status = reasons.length > 0 ? "FAILED" : "COMPLETED";
    }
  } else if (["REJECT", "FAILED", "FAIL", "ERROR"].includes(taskRawStatus)) {
    status = "FAILED";
  }

  const skuReasons = firstSku?.sku?.reasons || [];
  const taskReasons = firstSku?.reasons || [];
  const allReasons = [...new Set([...skuReasons, ...taskReasons])];
  const reason = allReasons.join(" | ") || "";

  return {
    success: true,
    taskId: Number(taskId),
    status,
    reason,
    raw: data,
  };
}

/* ======================================================
   MAĞAZA ÜRÜNLERİNİ LİSTELE (REST)
====================================================== */
export async function n11ListProducts({ companyId, userId, page = 0, size = 50 }) {
  const cfg = await getN11SettingsFromDB({ companyId, userId });

  const response = await axios.get(
    "https://api.n11.com/ms/product-query",
    {
      headers: n11Headers(cfg),
      params: { page, size },
      timeout: 15000,
    }
  );

  const data = response.data;
  return {
    success: true,
    products: (data?.content || []).map((p) => ({
      n11ProductId: p.id,
      title: p.title,
      sellerCode: p.sellerCode,
      barcode: p.barcode,
      price: p.salePrice,
      listPrice: p.listPrice,
      stock: p.stockQuantity,
      status: p.approved ? "ACTIVE" : "PASSIVE",
    })),
    totalElements: data?.totalElements || 0,
    totalPages: data?.totalPages || 1,
  };
}

/* ======================================================
   ONAY DURUMU SORGULA (REST)
====================================================== */
export async function n11GetApprovalStatus({ companyId, userId, productId }) {
  const cfg = await getN11SettingsFromDB({ companyId, userId });
  
  const response = await axios.get(
    `https://api.n11.com/ms/product-query/${productId}`,
    { headers: n11Headers(cfg), timeout: 15000 }
  );

  return {
    success: true,
    approved: response.data?.approved || false,
    status: response.data?.status,
    raw: response.data,
  };
}

/* ======================================================
   SOAP SIPARIŞ SERVISI
====================================================== */
const N11_SOAP_CONFIG = {
  ORDER_WSDL: 'https://api.n11.com/ws/OrderService.wsdl',
  ORDER_ENDPOINT: 'https://api.n11.com/ws/OrderService',
};

let soapClientCache = null;

async function getOrderSoapClient() {
  if (soapClientCache) return soapClientCache;
  
  soapClientCache = await soap.createClientAsync(N11_SOAP_CONFIG.ORDER_WSDL, {
    endpoint: N11_SOAP_CONFIG.ORDER_ENDPOINT,
    forceSoap12Headers: false,
  });
  
  return soapClientCache;
}

export async function n11GetOrders({ companyId, userId, searchData = {}, pagingData = { currentPage: 0, pageSize: 20 }, fetchDetails = true }) {
  const cfg = await getN11SettingsFromDB({ companyId, userId });
  const client = await getOrderSoapClient();
  
  // Önce liste çek
  const listArgs = {
    auth: { appKey: cfg.appKey, appSecret: cfg.appSecret },
    searchData: {
      productId: searchData.productId || '',
      status: searchData.status || '',
      buyerName: searchData.buyerName || '',
      orderNumber: searchData.orderNumber || '',
      productSellerCode: searchData.productSellerCode || '',
      recipient: searchData.recipient || '',
      ...(searchData.period ? { period: { startDate: searchData.period.startDate, endDate: searchData.period.endDate } } : {}),
    },
    pagingData: { currentPage: pagingData.currentPage || 0, pageSize: pagingData.pageSize || 20 }
  };

  if (!listArgs.searchData.period) delete listArgs.searchData.period;

  console.log(`[N11] OrderList isteği gönderiliyor...`);
  const [listResult] = await client.OrderListAsync(listArgs);

  if (listResult?.result?.status === 'failure') {
    throw new Error(`N11 API Hatası: ${listResult.result.errorMessage}`);
  }

  const orders = listResult?.orderList?.order || [];
  console.log(`[N11] ${orders.length} sipariş listelendi`);

  // Detay çekme istenmiyorsa veya sipariş yoksa direkt dön
  if (!fetchDetails || orders.length === 0) {
    return {
      success: true,
      orders: orders,
      pagingData: listResult?.pagingData || {},
    };
  }
  
  // Her sipariş için detay çek (zengin veri için)
  console.log(`[N11] ${orders.length} sipariş için detay çekiliyor...`);
  
  const detailedOrders = [];
  let successCount = 0;
  let errorCount = 0;

  for (const order of orders) {
    try {
      const detailArgs = {
        auth: { appKey: cfg.appKey, appSecret: cfg.appSecret },
        orderRequest: { id: order.id }
      };
      
      const [detailResult] = await client.OrderDetailAsync(detailArgs);
      
      if (detailResult?.order) {
        // Liste ve detay verilerini birleştir
        detailedOrders.push({
          ...order,
          ...detailResult.order,
          id: order.id, // Liste ID'si koru
          orderNumber: order.orderNumber || detailResult.order.orderNumber, // Liste orderNumber öncelikli
        });
        successCount++;
      } else {
        // Detay boşsa liste verisini kullan
        detailedOrders.push(order);
      }
      
      // Rate limiting için küçük bekleme (isteğe bağlı)
      // await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.error(`[N11] Sipariş detay hatası ${order.id}:`, err.message);
      detailedOrders.push(order); // Hata durumunda temel veriyi kullan
      errorCount++;
    }
  }

  console.log(`[N11] Detay çekme tamamlandı: ${successCount} başarılı, ${errorCount} hatalı`);

  return {
    success: true,
    orders: detailedOrders,
    pagingData: listResult?.pagingData || {},
  };
}
export async function n11GetOrderDetail({ companyId, userId, orderId }) {
  const cfg = await getN11SettingsFromDB({ companyId, userId });
  const client = await getOrderSoapClient();
  
  const args = {
    auth: { appKey: cfg.appKey, appSecret: cfg.appSecret },
    orderRequest: { id: orderId }
  };

  const [result] = await client.OrderDetailAsync(args);

  if (result?.result?.status === 'failure') {
    throw new Error(`N11 API Hatası: ${result.result.errorMessage}`);
  }

  return {
    success: true,
    order: result?.order,
  };
}

/* ======================================================
   DEFAULT EXPORT
====================================================== */
const N11Service = { 
  getN11SettingsFromDB, 
  n11CreateProduct, 
  n11GetTaskStatus, 
  n11ListProducts,
  n11GetApprovalStatus,
  n11GetOrders,
  n11GetOrderDetail,
};

export default N11Service;