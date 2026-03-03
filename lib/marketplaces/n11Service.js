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
  const appSecret = n11.appSecret || process.env.N11_APP_SECRET || process.env.N11_SECRET;

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

  const baseImages = product.images?.length ? product.images.slice(0, 8).map((img, i) => ({ url: typeof img === "string" ? img : img?.url, order: i + 1 })).filter((i) => i.url) : [];
  const brandIdNum = product.marketplaceSettings?.n11?.brandId ? Number(product.marketplaceSettings.n11.brandId) : product.n11BrandId ? Number(product.n11BrandId) : null;

  let skus;
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    skus = product.variants.map((v, i) => {
      const variantTitle = [v.color, v.size].filter(Boolean).join(" / ");
      const skuTitle = variantTitle ? `${title} - ${variantTitle}` : `${title} (Varyant ${i + 1})`;
      const vStockCode = String(v.sku || product.sku || product._id).trim() || `${stockCode}-V${i + 1}`;
      const vBarcode = v.barcode || product.barcode || product.barkod || "";
      const vSale = Number(v.priceTl ?? v.salePrice ?? salePrice) || 0;
      const vList = Math.max(vSale * 1.1, vSale + 0.01);
      const vQty = Number(v.stock ?? v.quantity ?? 0) || 0;
      const vImgs = Array.isArray(v.images) && v.images.length > 0
        ? v.images.slice(0, 8).map((url, j) => ({ url: typeof url === "string" ? url : url?.url, order: j + 1 })).filter((x) => x.url)
        : baseImages;
      return {
        stockCode: vStockCode,
        title: skuTitle,
        description,
        categoryId: Number(categoryId),
        ...(vBarcode ? { barcode: String(vBarcode) } : {}),
        listPrice: vList,
        salePrice: vSale,
        quantity: vQty,
        currencyType: product.currencyType || "TL",
        preparingDay,
        ...(shipmentTemplate ? { shipmentTemplate } : {}),
        vatRate,
        ...(vImgs.length ? { images: vImgs } : {}),
        ...(brandIdNum != null ? { brandId: brandIdNum } : {}),
        ...(attributes.length ? { attributes } : {}),
      };
    });
  } else {
    skus = [{
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
      ...(baseImages.length ? { images: baseImages } : {}),
      ...(brandIdNum != null ? { brandId: brandIdNum } : {}),
      ...(attributes.length ? { attributes } : {}),
    }];
  }

  const payload = {
    integrator: cfg.integrator,
    skus,
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

/**
 * Tek sipariş detayını N11 XML API ile çeker (detay sayfasıyla aynı yöntem).
 * Müşteri adı (recipient, buyer.fullName) bu yanıtta düzgün gelir.
 * @param {{ appKey: string, appSecret: string }} cfg
 * @param {string} orderNumber
 * @returns {Promise<object|null>} raw order object veya null
 */
async function fetchOrderDetailByOrderNumberXml(cfg, orderNumber) {
  if (!orderNumber) return null;
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:sch="http://www.n11.com/ws/schemas">
  <soapenv:Header/>
  <soapenv:Body>
    <sch:DetailedOrderListRequest>
      <auth>
        <appKey>${cfg.appKey}</appKey>
        <appSecret>${cfg.appSecret}</appSecret>
      </auth>
      <pagingData>
        <currentPage>0</currentPage>
        <pageSize>1</pageSize>
      </pagingData>
      <searchData>
        <orderNumber>${orderNumber}</orderNumber>
      </searchData>
    </sch:DetailedOrderListRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const { data } = await axios.post(N11_SOAP_CONFIG.ORDER_ENDPOINT, xml, {
      headers: { 'Content-Type': 'text/xml;charset=UTF-8' },
      timeout: 15000,
    });
    const xml2js = await import('xml2js');
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(data);
    const envelope = parsed?.['SOAP-ENV:Envelope'] || parsed?.['soapenv:Envelope'] || parsed?.Envelope;
    const body = envelope?.['SOAP-ENV:Body'] || envelope?.['soapenv:Body'] || envelope?.Body;
    const resp = body?.['ns3:DetailedOrderListResponse'] || body?.DetailedOrderListResponse || body?.['sch:DetailedOrderListResponse'];
    if (!resp) return null;
    const status = (resp.result && resp.result.status) || resp.status;
    if (String(status || '').toLowerCase() === 'failure') return null;
    let orderList = resp.orderList?.order ?? resp.detailedOrderList?.order ?? resp.orderList ?? resp.detailedOrderList;
    if (!orderList) return null;
    if (Array.isArray(orderList)) orderList = orderList[0];
    if (orderList && typeof orderList === 'object') return orderList;
    return null;
  } catch (err) {
    console.warn(`[N11] XML detay sipariş ${orderNumber}:`, err?.message);
    return null;
  }
}

/** ERP/cari için: sipariş numarasıyla N11'den müşteri adı dahil detay çeker. */
export async function getN11OrderDetailByOrderNumber(companyId, userId, orderNumber) {
  const cfg = await getN11SettingsFromDB({ companyId, userId });
  return fetchOrderDetailByOrderNumberXml(cfg, orderNumber);
}

function ensureArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function getPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function pickFirst(obj, paths) {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function unwrapSoapResponse(obj, preferredKeys = []) {
  if (!obj || typeof obj !== 'object') return obj;
  let cur = obj;

  for (const k of preferredKeys) {
    if (cur[k] && typeof cur[k] === 'object') {
      cur = cur[k];
      break;
    }
  }

  if (cur === obj) {
    const keys = Object.keys(cur);
    const respKey = keys.find((k) => /Response$/i.test(k));
    if (respKey && cur[respKey] && typeof cur[respKey] === 'object') {
      cur = cur[respKey];
    }
  }

  // Bazı SOAP client çıktıları: { SomethingResponse: { SomethingResult: {...} } }
  // Tek anahtar "Result" ile bitiyorsa otomatik unwrap et.
  for (let i = 0; i < 2; i++) {
    if (!cur || typeof cur !== 'object') break;
    const keys = Object.keys(cur);
    if (keys.length === 1) {
      const onlyKey = keys[0];
      const v = cur[onlyKey];
      if (v && typeof v === 'object' && /Result$/i.test(onlyKey)) {
        cur = v;
        continue;
      }
    }
    break;
  }

  return cur;
}

function findDeepKey(obj, keyName, maxDepth = 4) {
  const seen = new Set();
  function walk(node, depth) {
    if (!node || typeof node !== 'object') return undefined;
    if (seen.has(node)) return undefined;
    seen.add(node);
    if (Object.prototype.hasOwnProperty.call(node, keyName)) {
      const v = node[keyName];
      if (v && typeof v === 'object') return v;
    }
    if (depth <= 0) return undefined;
    if (Array.isArray(node)) {
      for (const it of node) {
        const found = walk(it, depth - 1);
        if (found) return found;
      }
      return undefined;
    }
    for (const k of Object.keys(node)) {
      const found = walk(node[k], depth - 1);
      if (found) return found;
    }
    return undefined;
  }
  return walk(obj, maxDepth);
}

export async function n11GetOrders({ companyId, userId, searchData = {}, pagingData = { currentPage: 0, pageSize: 20 } }) {
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

  async function callList(opName) {
    console.log(`[N11] ${opName === 'DetailedOrderListAsync' ? 'DetailedOrderList' : 'OrderList'} isteği gönderiliyor...`);
    const [raw] = await client[opName](listArgs);
    const root = unwrapSoapResponse(
      raw,
      opName === 'DetailedOrderListAsync'
        ? ['DetailedOrderListResponse', 'detailedOrderListResponse', 'DetailedOrderListResult', 'detailedOrderListResult']
        : ['OrderListResponse', 'orderListResponse', 'OrderListResult', 'orderListResult']
    );

    const status = pickFirst(root, ['result.status', 'resultStatus', 'status']) || pickFirst(raw, ['result.status']);
    const errorMessage =
      pickFirst(root, ['result.errorMessage', 'result.error', 'errorMessage', 'message']) ||
      pickFirst(raw, ['result.errorMessage', 'result.error', 'errorMessage', 'message']);

    const list = ensureArray(
      pickFirst(root, [
        'orderList.order',
        'orderList',
        'detailedOrderList.order',
        'detailedOrderList',
        'orders.order',
        'orders',
      ]) ||
        pickFirst(raw, ['orderList.order', 'orderList', 'detailedOrderList.order', 'detailedOrderList'])
    );

    return { raw, root, status, errorMessage, orders: list };
  }

  const canDetailed = typeof client?.DetailedOrderListAsync === 'function';
  let listOp = canDetailed ? 'DetailedOrderListAsync' : 'OrderListAsync';

  let listResult;
  try {
    listResult = await callList(listOp);
  } catch (err) {
    if (listOp === 'DetailedOrderListAsync') {
      console.warn(`[N11] DetailedOrderList çağrısı başarısız, OrderList'e düşülüyor:`, err?.message || err);
      listOp = 'OrderListAsync';
      listResult = await callList(listOp);
    } else {
      throw err;
    }
  }

  // Eğer DetailedOrderList status=failure döndüyse (N11 bazen "aralıklarla güncellenir" diyebiliyor)
  if (String(listResult.status || '').toLowerCase() === 'failure') {
    if (listOp === 'DetailedOrderListAsync') {
      console.warn(`[N11] DetailedOrderList failure, OrderList'e düşülüyor: ${listResult.errorMessage || ''}`);
      listOp = 'OrderListAsync';
      listResult = await callList(listOp);
    } else {
      throw new Error(`N11 API Hatası: ${listResult.errorMessage || 'Bilinmeyen hata'}`);
    }
  }

  const orders = Array.isArray(listResult.orders) ? listResult.orders : [];
  console.log(`[N11] ${orders.length} sipariş listelendi`);

  if (orders.length === 0) {
    return {
      success: true,
      orders: [],
      pagingData: pickFirst(listResult.root, ['pagingData']) || listResult.raw?.pagingData || {},
    };
  }
  
  // Detailed list geldiyse ayrıca OrderDetail'e gerek yok
  const looksDetailed = (o) =>
    !!(o?.buyer || o?.recipient || o?.shippingAddress || o?.billingAddress || o?.orderItemList || o?.itemList);

  if (listOp === 'DetailedOrderListAsync' || looksDetailed(orders[0])) {
    return {
      success: true,
      orders,
      pagingData: pickFirst(listResult.root, ['pagingData']) || listResult.raw?.pagingData || {},
    };
  }

  // Her sipariş için detay çek (XML API - detay sayfasıyla aynı; müşteri adı burada gelir)
  console.log(`[N11] ${orders.length} sipariş için detay çekiliyor (XML)...`);
  
  const detailPromises = orders.map(async (order) => {
    const orderNo = String(order?.orderNumber ?? order?.orderNo ?? '');
    if (!orderNo) return order;
    try {
      const rawOrder = await fetchOrderDetailByOrderNumberXml(cfg, orderNo);
      if (rawOrder) {
        const fullName = rawOrder.recipient || rawOrder.buyerName || rawOrder.buyer?.fullName || '';
        if (fullName) console.log(`[N11] Sipariş ${orderNo} müşteri: ${fullName}`);
        return {
          ...order,
          ...rawOrder,
          id: order?.id ?? rawOrder.id,
          orderNumber: orderNo || rawOrder.orderNumber,
          buyer: rawOrder.buyer || order.buyer,
          recipient: rawOrder.recipient ?? order.recipient,
          buyerName: rawOrder.buyerName ?? rawOrder.recipient ?? rawOrder.buyer?.fullName,
          shippingAddress: rawOrder.shippingAddress ?? order.shippingAddress,
          orderItemList: rawOrder.orderItemList ?? order.orderItemList,
          totalAmount: rawOrder.totalAmount ?? order.totalAmount,
        };
      }
      return order;
    } catch (err) {
      console.warn(`[N11] Sipariş ${orderNo} detay:`, err?.message);
      return order;
    }
  });

  const detailedOrders = await Promise.all(detailPromises);
  
  const successCount = detailedOrders.filter(o => o.buyer || o.totalAmount || o.recipient).length;
  const errorCount = orders.length - successCount;
  
  console.log(`[N11] Detay çekme tamamlandı: ${successCount} başarılı, ${errorCount} hatalı`);
  console.log(`[N11] İlk sipariş detaylı veri:`, JSON.stringify(detailedOrders[0], null, 2));

  return {
    success: true,
    orders: detailedOrders,
    pagingData: pickFirst(listResult?.root, ['pagingData']) || listResult?.raw?.pagingData || {},
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