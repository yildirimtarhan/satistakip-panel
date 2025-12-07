// 📁 /lib/marketplaces/n11Service.js
import axios from "axios";

/**
 * N11 REST Create Product
 * Doküman: POST https://api.n11.com/ms/product/tasks/product-create
 */

export async function n11CreateProduct(product) {
  try {
    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_API_SECRET || process.env.N11_APP_SECRET;
    const INTEGRATOR = process.env.N11_INTEGRATOR_NAME || "SatisTakipERP";

    if (!APP_KEY || !APP_SECRET) {
      return { success: false, message: "N11 API bilgileri eksik" };
    }

    // Üründen gelen ERP alanları
    const {
      name,
      sku,
      barcode,
      description,
      priceTl,
      discountPriceTl,
      vatRate,
      stock,
      images = [],
      marketplaceSettings = {},
      modelCode,
      brand,
    } = product;

    const n11 = marketplaceSettings.n11 || {};

    // Fiyatlar
    const salePrice = Number(priceTl ?? 0);
    let listPrice = Number(discountPriceTl ?? 0);
    if (!listPrice || listPrice < salePrice) {
      listPrice = salePrice;
    }

    const quantity = Number(stock ?? 0);

    // 👇👇 ZORUNLU ATTRIBUTES – HER KATEGORİDE ÇALIŞIR 👇👇
    const attributes = [
      {
        id: null,
        valueId: null,
        customValue: brand || "",
      },
      {
        id: null,
        valueId: null,
        customValue: modelCode || sku || "",
      },
      {
        id: null,
        valueId: null,
        customValue: "2 Yıl Garantili",
      },
    ];

    // ✔ N11'e gönderilecek SKU Paketi
    const skuObj = {
      title: name || sku || "SatışTakip Ürünü",
      description: description || "",
      categoryId: n11.categoryId ? Number(n11.categoryId) : undefined,
      currencyType: "TL",
      productMainId: sku || String(product._id || ""),
      preparingDay: Number(n11.preparingDay || 3),
      shipmentTemplate: n11.shipmentTemplate || "STANDART",
      stockCode: sku || String(product._id || ""),

      maxPurchaseQuantity: n11.maxPurchaseQuantity
        ? Number(n11.maxPurchaseQuantity)
        : undefined,

      catalogId: null,
      barcode: barcode || null,
      quantity,
      images: (images || []).map((url, index) => ({
        url,
        order: index,
      })),

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

    const status = data.status;
    const reasons = Array.isArray(data.reasons)
      ? data.reasons.join(" | ")
      : "";

    const success = status === "IN_QUEUE";

    return {
      success,
      taskId: data.id || null,
      productId: null,
      message:
        success
          ? reasons || "N11 ürün task'ı kuyruğa alındı."
          : reasons || "N11 ürün isteği reddedildi.",
      raw: data,
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
      productId: null,
      message:
        apiReasons || err.message || "N11 ürün gönderilemedi",
      error: err,
    };
  }
}

// ------------------------------------------------------
// 🟦 Task Status — Şimdilik dummy, sonra gerçek N11 Task API bağlanır
// ------------------------------------------------------
export async function n11GetApprovalStatus(taskId) {
  try {
    return {
      success: true,
      status: "IN_QUEUE",
      taskId,
      message: "Dummy TaskDetails. Sonra gerçek API bağlanır.",
    };
  } catch (err) {
    return {
      success: false,
      status: "Error",
      taskId,
      message: err.message || "Unknown error",
    };
  }
}
