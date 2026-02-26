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
 * N11 Sipariş Listesi Çekme (SOAP)
 */
export async function n11GetOrders({ companyId, userId, searchData = {}, pagingData = { currentPage: 0, pageSize: 20 } }) {
  const cfg = await getN11SettingsFromDB({ companyId, userId });
  const client = await getOrderSoapClient();
  
  const args = {
    auth: {
      appKey: cfg.appKey,
      appSecret: cfg.appSecret,
    },
    searchData: {
      productId: searchData.productId || '',
      status: searchData.status || '',
      buyerName: searchData.buyerName || '',
      orderNumber: searchData.orderNumber || '',
      productSellerCode: searchData.productSellerCode || '',
      recipient: searchData.recipient || '',
      ...(searchData.period ? {
        period: {
          startDate: searchData.period.startDate,
          endDate: searchData.period.endDate,
        }
      } : {}),
    },
    pagingData: {
      currentPage: pagingData.currentPage || 0,
      pageSize: pagingData.pageSize || 20,
    }
  };

  if (!args.searchData.period) delete args.searchData.period;

  const [result] = await client.OrderListAsync(args);

  if (result?.result?.status === 'failure') {
    throw new Error(`N11 API Hatası: ${result.result.errorMessage}`);
  }

  return {
    success: true,
    orders: result?.orderList?.order || [],
    pagingData: result?.pagingData || {},
  };
}

/**
 * N11 Sipariş Detayı Çekme (SOAP)
 */
export async function n11GetOrderDetail({ companyId, userId, orderId }) {
  const cfg = await getN11SettingsFromDB({ companyId, userId });
  const client = await getOrderSoapClient();
  
  const args = {
    auth: {
      appKey: cfg.appKey,
      appSecret: cfg.appSecret,
    },
    orderRequest: {
      id: orderId,
    }
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
  n11GetOrders,
  n11GetOrderDetail,
};

export default N11Service;