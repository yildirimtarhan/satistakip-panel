import axios from "axios";
import dbConnect from "@/lib/dbConnect";
import Settings from "@/models/Settings";

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
  const appSecret = n11.appSecret || process.env.N11_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error("N11 appKey/appSecret bulunamadı (Settings.n11 veya ENV).");
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
   POST https://api.n11.com/ms/product/tasks/product-create
====================================================== */
export async function n11CreateProduct(req, product) {
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

  // Zorunlu alanları kontrol et
  const title = product.name || product.title || product.ad;
  const stockCode = product.sku || product.barcode || product.barkod || String(product._id);
  const salePrice = Number(product.price || product.priceTl || product.salePrice || 0);
  const listPrice = Number(product.listPrice || product.priceTlList || (salePrice * 1.1).toFixed(2));
  const stock = Number(product.stock ?? product.quantity ?? 0);
  const description = product.description || product.aciklama || title;
  const categoryId =
    product.marketplaceSettings?.n11?.categoryId ||
    product.n11CategoryId ||
    product.categoryId;

  if (!title) throw new Error("Ürün başlığı (name/title) zorunlu");
  if (!categoryId) throw new Error("N11 kategori ID (n11CategoryId) zorunlu");

  const payload = {
    integrator: cfg.integrator,
    skus: [
      {
        stockCode,
        title,
        description,
        categoryId: Number(categoryId),
        listPrice: Math.max(listPrice, salePrice + 0.01),
        salePrice,
        quantity: stock,
        currencyType: product.currencyType || "TL",
        preparingDay: product.preparingDay || 3,
        shipmentTemplate: product.shipmentTemplate || "STANDART",
        vatRate: product.vatRate ?? 20,
        // Görsel varsa
        ...(product.images?.length
          ? { images: product.images.slice(0, 8).map((img, i) => ({ url: img, order: i + 1 })) }
          : {}),
        // Varyant özellikler varsa
        ...(product.n11Attributes?.length ? { attributes: product.n11Attributes } : {}),
      },
    ],
  };

  const response = await axios.post(
    "https://api.n11.com/ms/product/tasks/product-create",
    { payload },
    { headers: n11Headers(cfg), timeout: 20000 }
  );

  const taskId = response.data?.id || response.data?.taskId;
  const status = response.data?.status || "IN_QUEUE";

  return {
    success: true,
    taskId,
    status,
    message: response.data?.reasons?.[0] || "N11'e gönderildi, kuyrukta işleniyor",
    raw: response.data,
  };
}

/* ======================================================
   TASK STATUS SORGU (REST)
   POST https://api.n11.com/ms/product/task-details/page-query
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
  const rawStatus = data?.status || "IN_QUEUE";
  const s = String(rawStatus).toUpperCase();

  let status = "IN_QUEUE";
  if (["PROCESSED", "COMPLETED", "SUCCESS", "DONE"].includes(s)) status = "COMPLETED";
  if (["REJECT", "FAILED", "FAIL", "ERROR"].includes(s)) status = "FAILED";

  const firstSku = data?.skus?.content?.[0];
  const reason = firstSku?.sku?.reasons?.[0] || "";

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
   GET https://api.n11.com/ms/product-query
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
   DEFAULT EXPORT
====================================================== */
const N11Service = { getN11SettingsFromDB, n11CreateProduct, n11GetTaskStatus, n11ListProducts };
export default N11Service;
