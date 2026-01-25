import axios from "axios";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

/**
 * ✅ N11 REST Create Product
 * - Önce DB settings(companyId) -> yoksa ENV fallback
 * - Multi-tenant uyumlu
 */
export async function n11CreateProduct(req, product) {
  try {
    // ✅ Settings: DB + ENV fallback
    const cfg = await getN11SettingsFromRequest(req);

    const APP_KEY = cfg.appKey || process.env.N11_APP_KEY || "";
    const APP_SECRET =
      cfg.appSecret ||
      process.env.N11_API_SECRET ||
      process.env.N11_APP_SECRET ||
      "";

    const INTEGRATOR = process.env.N11_INTEGRATOR_NAME || "SatisTakipERP";

    if (!APP_KEY || !APP_SECRET) {
      return {
        success: false,
        message:
          "N11 API bilgileri eksik. API Ayarları'ndan girin veya ENV tanımlayın.",
      };
    }

    const {
      name,
      sku,
      barcode,
      description,
      priceTl,
      discountPriceTl,
      vatRate,
      stock,
      images,
      marketplaceSettings,
      modelCode,
      brand,
    } = product || {};

    const n11 = marketplaceSettings?.n11 || {};

    const salePrice = Number(priceTl ?? 0);
    let listPrice = Number(discountPriceTl ?? 0);
    if (!listPrice || listPrice < salePrice) listPrice = salePrice;

    const quantity = Number(stock ?? 0);

    // ✅ Görselleri normalize et (images array olsun)
    const imgList = Array.isArray(images) ? images : [];

    const normalizedImages = imgList
      .filter((u) => u && String(u).trim())
      .map((url, index) => ({ url, order: index }));

    // ✅ Basit attributes (geliştirilebilir)
    const attributes = [
      { id: null, valueId: null, customValue: brand || "" },
      { id: null, valueId: null, customValue: modelCode || sku || "" },
    ];

    // ✅ N11 SKU objesi
    const skuObj = {
      title: name || sku || "SatışTakip Ürünü",
      description: description || "",
      categoryId: n11.categoryId ? Number(n11.categoryId) : undefined,
      currencyType: "TL",
      productMainId: sku || String(product?._id || ""),
      preparingDay: Number(n11.preparingDay || 3),
      shipmentTemplate: n11.shipmentTemplate || "STANDART",
      stockCode: sku || String(product?._id || ""),
      barcode: barcode || null,
      quantity,
      images: normalizedImages,
      attributes,
      salePrice,
      listPrice,
      vatRate: Number(vatRate ?? 20),
    };

    const payload = {
      payload: {
        integrator: INTEGRATOR,
        skus: [skuObj],
      },
    };

    const url = "https://api.n11.com/ms/product/tasks/product-create";

    const headers = {
      "Content-Type": "application/json",
      appkey: APP_KEY,
      appsecret: APP_SECRET,
    };

    const response = await axios.post(url, payload, { headers });
    const data = response.data || {};

    const reasons = Array.isArray(data.reasons) ? data.reasons.join(" | ") : "";
    const success = data.status === "IN_QUEUE";

    return {
      success,
      taskId: data.id || null,
      message: success
        ? reasons || "✅ N11 ürün task'ı kuyruğa alındı."
        : reasons || "❌ N11 ürün isteği reddedildi.",
      raw: data,
      source: cfg.source || "env",
    };
  } catch (err) {
    console.error("N11 PRODUCT CREATE ERROR:", err?.response?.data || err);

    const apiReasons =
      err?.response?.data?.reasons &&
      Array.isArray(err.response.data.reasons)
        ? err.response.data.reasons.join(" | ")
        : null;

    return {
      success: false,
      taskId: null,
      message: apiReasons || err.message || "N11 ürün gönderilemedi",
      error: err?.response?.data || err,
    };
  }
}

/**
 * (Şimdilik dummy, sonra gerçek TaskDetails endpoint bağlanabilir)
 */
export async function n11GetApprovalStatus(taskId) {
  return {
    success: true,
    status: "IN_QUEUE",
    taskId,
    message: "Dummy TaskDetails",
  };
}
