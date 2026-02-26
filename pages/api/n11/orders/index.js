// pages/api/n11/orders/index.js - ERP Company/User bazlı Multi-Tenant
import { createHmac } from 'crypto';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';

// Cache yapılandırması
const CACHE_DURATION = 30000;
const companyCaches = new Map();

// Rate limiting
const companyRateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS = 30;

// Logger
const logger = {
  info: (msg, meta = {}) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta),
  error: (msg, error, meta = {}) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, {
    error: error?.message,
    ...meta
  }),
  warn: (msg, meta = {}) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, meta)
};

/**
 * JWT Token'dan companyId ve userId çıkar
 */
function extractAuthFromToken(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    throw new Error('TOKEN_MISSING');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      userId: decoded.userId || decoded._id || decoded.id,
      companyId: decoded.companyId || null
    };
  } catch (err) {
    throw new Error('TOKEN_INVALID');
  }
}

/**
 * MongoDB'den Company N11 Ayarlarını Getir
 */
async function getCompanyN11Settings(companyId, userId) {
  const { db } = await connectToDatabase();
  
  // Önce settings koleksiyonunda ara (yeni yapı)
  let settings = null;
  
  if (companyId) {
    settings = await db.collection('settings').findOne({ companyId });
  }
  
  // Yoksa userId ile ara (eski yapı fallback)
  if (!settings && userId) {
    settings = await db.collection('settings').findOne({ userId });
  }
  
  // Hala yoksa company_settings'de ara
  if (!settings && companyId) {
    const companySettings = await db.collection('company_settings').findOne({ companyId });
    if (companySettings?.n11) {
      settings = { n11: companySettings.n11 };
    }
  }
  
  // User modelinde de ara (en son fallback)
  if (!settings && userId) {
    const user = await db.collection('users').findOne(
      { _id: new require('mongodb').ObjectId(userId) },
      { projection: { n11Api: 1 } }
    );
    if (user?.n11Api?.appKey) {
      settings = {
        n11: {
          appKey: user.n11Api.appKey,
          appSecret: user.n11Api.appSecret,
          environment: 'live'
        }
      };
    }
  }

  if (!settings?.n11?.appKey || !settings?.n11?.appSecret) {
    throw new Error('N11_CREDENTIALS_NOT_FOUND');
  }

  return {
    apiKey: settings.n11.appKey,
    secretKey: settings.n11.appSecret,
    environment: settings.n11.environment || 'production',
    companyId,
    userId
  };
}

/**
 * Rate limiting (Company bazlı)
 */
function checkCompanyRateLimit(companyId, userId) {
  const key = companyId || userId;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!companyRateLimits.has(key)) {
    companyRateLimits.set(key, new Map());
  }
  
  const limits = companyRateLimits.get(key);
  
  // Eski kayıtları temizle
  for (const [timestamp, count] of limits.entries()) {
    if (timestamp < windowStart) limits.delete(timestamp);
  }
  
  // İstek sayısını hesapla
  let requestCount = 0;
  for (const timestamp of limits.keys()) {
    if (timestamp > windowStart) requestCount += limits.get(timestamp);
  }
  
  if (requestCount >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000) };
  }
  
  limits.set(now, (limits.get(now) || 0) + 1);
  return { allowed: true };
}

/**
 * Cache yönetimi
 */
function getCompanyCache(companyId, userId) {
  const key = companyId || userId;
  return companyCaches.get(key) || { data: null, timestamp: null, key: null };
}

function setCompanyCache(companyId, userId, cacheKey, data) {
  const key = companyId || userId;
  companyCaches.set(key, { data, timestamp: Date.now(), key: cacheKey });
}

/**
 * N11 API İmza oluşturma
 */
function createN11Signature(apiKey, secretKey, timestamp) {
  const signatureString = `${apiKey}${secretKey}${timestamp}`;
  return createHmac('sha256', secretKey).update(signatureString).digest('hex');
}

/**
 * N11 API'den siparişleri çek
 */
async function fetchOrdersFromN11(params, credentials) {
  const { apiKey, secretKey, environment } = credentials;
  const timestamp = Date.now().toString();
  const signature = createN11Signature(apiKey, secretKey, timestamp);
  
  // N11 API endpoint (SOAP yerine REST kullanıyoruz)
  const baseUrl = environment === 'test' 
    ? 'https://api.n11.com/ws/OrderService.wsdl'
    : 'https://api.n11.com/ws/OrderService.wsdl';

  const requestBody = {
    appKey: apiKey,
    appSecret: secretKey,
    timestamp,
    sign: signature,
    searchData: {
      productId: params.productId || '',
      status: params.status || '',
      buyerName: params.buyerName || '',
      orderNumber: params.orderNumber || '',
      productSellerCode: params.productSellerCode || '',
      recipient: params.recipient || '',
      period: {
        startDate: params.startDate || '',
        endDate: params.endDate || ''
      },
      sortField: params.sortField || 'id',
      sortOrder: params.sortOrder || 'desc',
      pagingData: {
        currentPage: parseInt(params.page) || 1,
        pageSize: Math.min(parseInt(params.size) || 20, 100)
      }
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ERP-N11-Integration/2.0'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`N11_HTTP_${response.status}`);
    }

    const data = await response.json();
    
    if (data.result?.status !== 'success') {
      throw new Error(`N11_API_ERROR: ${data.result?.errorMessage || 'Unknown'}`);
    }

    return {
      success: true,
      orders: data.orderList?.order || [],
      pagination: {
        currentPage: data.pagingData?.currentPage || 1,
        pageSize: data.pagingData?.pageSize || 20,
        totalCount: data.pagingData?.totalCount || 0,
        pageCount: data.pagingData?.pageCount || 1
      },
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'n11-api',
        environment
      }
    };

  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Ana API Handler
 */
export default async function handler(req, res) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Request-ID', requestId);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      requestId
    });
  }

  try {
    // 1. JWT Token'dan auth bilgilerini çıkar
    const { userId, companyId } = extractAuthFromToken(req);
    logger.info('Auth başarılı', { requestId, userId, companyId: companyId || 'null' });

    // 2. Rate limit kontrolü
    const rateCheck = checkCompanyRateLimit(companyId, userId);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', rateCheck.retryAfter);
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Çok fazla istek. ${rateCheck.retryAfter} saniye sonra tekrar deneyin.`,
        requestId
      });
    }

    // 3. MongoDB'den N11 ayarlarını getir
    const credentials = await getCompanyN11Settings(companyId, userId);
    logger.info('N11 credentials bulundu', { 
      requestId, 
      companyId: credentials.companyId,
      environment: credentials.environment 
    });

    // 4. Parametreleri işle
    const params = req.method === 'POST' ? req.body : req.query;
    
    // 5. Cache kontrolü
    const cacheKey = JSON.stringify({
      ...params,
      companyId: credentials.companyId,
      userId: credentials.userId
    });
    
    const cache = getCompanyCache(companyId, userId);
    if (req.method === 'GET' && 
        cache.data && 
        cache.key === cacheKey && 
        (Date.now() - cache.timestamp) < CACHE_DURATION) {
      
      logger.info('Cache hit', { requestId });
      return res.status(200).json({
        ...cache.data,
        metadata: { ...cache.data.metadata, cache: true },
        requestId
      });
    }

    // 6. N11 API'den veri çek
    const result = await fetchOrdersFromN11(params, credentials);
    
    // 7. Cache'e al
    if (req.method === 'GET') {
      setCompanyCache(companyId, userId, cacheKey, result);
    }

    const duration = Date.now() - startTime;
    logger.info('İstek tamamlandı', { requestId, duration, orderCount: result.orders.length });

    return res.status(200).json({
      ...result,
      requestId,
      performance: { duration: `${duration}ms`, timestamp: new Date().toISOString() }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('İstek hatası', error, { requestId, duration });

    const errorMap = {
      'TOKEN_MISSING': { status: 401, code: 'AUTH_REQUIRED', message: 'Giriş yapmalısınız' },
      'TOKEN_INVALID': { status: 401, code: 'INVALID_TOKEN', message: 'Oturum süreniz dolmuş' },
      'N11_CREDENTIALS_NOT_FOUND': { status: 404, code: 'SETTINGS_NOT_FOUND', message: 'N11 API ayarları bulunamadı. Lütfen ayarlar sayfasından N11 bilgilerinizi girin.' },
      'AbortError': { status: 504, code: 'TIMEOUT', message: 'N11 API yanıt vermedi' }
    };

    const knownError = errorMap[error.message] || errorMap[error.name];
    
    if (knownError) {
      return res.status(knownError.status).json({
        success: false,
        error: knownError.code,
        message: knownError.message,
        requestId
      });
    }

    if (error.message.includes('N11_HTTP')) {
      return res.status(502).json({
        success: false,
        error: 'N11_API_ERROR',
        message: 'N11 API geçici olarak kullanılamıyor',
        requestId
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Sunucu hatası',
      requestId
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: '8mb',
    externalResolver: true,
  },
};