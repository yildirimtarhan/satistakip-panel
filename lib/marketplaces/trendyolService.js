// 📁 /lib/marketplaces/trendyolService.js — Trendyol v2 API: content-based ürün oluşturma
import axios from "axios";
import { productCreateV2Url } from "./trendyolConfig";

/**
 * @param {object} product - Ürün objesi
 * @param {{ supplierId: string, apiKey: string, apiSecret: string }} [credentials] - API Ayarları veya .env
 */
export async function trendyolCreateProduct(product, credentials = null) {
  try {
    const SUPPLIER_ID = credentials?.supplierId ?? process.env.TRENDYOL_SUPPLIER_ID;
    const API_KEY = credentials?.apiKey ?? process.env.TRENDYOL_API_KEY;
    const API_SECRET = credentials?.apiSecret ?? process.env.TRENDYOL_API_SECRET;
    const createUrl = productCreateV2Url(SUPPLIER_ID);

    if (!API_KEY || !API_SECRET) {
      return { success: false, message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol veya .env." };
    }

    const ty = product.marketplaceSettings?.trendyol || {};
    const brandId = Number(ty.brandId);
    const categoryId = Number(ty.categoryId);
    const parentSku = String(product.sku || product._id).slice(0, 100);
    const baseAttr = Array.isArray(ty.attributes) ? ty.attributes : [];
    const images = (product.images || []).slice(0, 8).map((u) => ({ url: String(typeof u === "string" ? u : u?.url || "").trim() })).filter((i) => i.url);

    if (!brandId || !categoryId) {
      return { success: false, message: "Trendyol için kategori ve marka ID zorunlu. Ürün düzenle → Pazaryeri Ayarları." };
    }
    if (images.length === 0) {
      return { success: false, message: "En az 1 görsel URL gerekli." };
    }

    const items = [];
    const productMainId = String(product.barcode || product.sku || product._id).replace(/\s/g, "").slice(0, 40);

    if (product.variants?.length > 0) {
      // Varyantlı: her varyant ayrı item (aynı productMainId)
      for (const v of product.variants) {
        const salePrice = Number(v.priceTl ?? product.priceTl ?? 0);
        const listPrice = Math.max(Number(v.priceTl ?? product.discountPriceTl ?? product.priceTl ?? salePrice), salePrice);
        const attrs = [...baseAttr];
        if (v.color) attrs.push({ attributeId: 338, customAttributeValue: String(v.color).slice(0, 50) });
        if (v.size) attrs.push({ attributeId: 339, customAttributeValue: String(v.size).slice(0, 50) });
        items.push({
          barcode: String(v.barcode || product.barcode || `${productMainId}-${v.sku || v.color || v.size}`).replace(/\s/g, "").slice(0, 40),
          title: String(product.name || "").slice(0, 100),
          productMainId,
          brandId,
          categoryId,
          quantity: Number(v.stock ?? 0),
          stockCode: String(v.sku || parentSku).slice(0, 100),
          dimensionalWeight: Number(ty.dimensionalWeight ?? ty.desi ?? 1),
          description: String(product.description || product.name || "").slice(0, 30000),
          listPrice,
          salePrice,
          vatRate: Number(product.vatRate ?? ty.vatRate ?? 20),
          images,
          attributes: attrs,
        });
      }
    } else {
      // Tek ürün
      const salePrice = Number(product.priceTl ?? 0);
      const listPrice = Math.max(Number(product.discountPriceTl ?? product.priceTl ?? salePrice), salePrice);
      items.push({
        barcode: String(product.barcode || productMainId).replace(/\s/g, "").slice(0, 40),
        title: String(product.name || "").slice(0, 100),
        productMainId,
        brandId,
        categoryId,
        quantity: Number(product.stock ?? 0),
        stockCode: parentSku,
        dimensionalWeight: Number(ty.dimensionalWeight ?? ty.desi ?? 1),
        description: String(product.description || product.name || "").slice(0, 30000),
        listPrice,
        salePrice,
        vatRate: Number(product.vatRate ?? ty.vatRate ?? 20),
        images,
        attributes: baseAttr,
      });
    }

    const response = await axios.post(
      createUrl,
      { items },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64"),
          "User-Agent": `${SUPPLIER_ID} - SatisTakip`,
        },
        timeout: 20000,
      }
    );

    if (response.data?.batchRequestId) {
      return {
        success: true,
        productId: response.data.batchRequestId,
        message: items.length > 1 ? "Trendyol v2: Varyantlı ürün gönderildi" : "Trendyol v2: Ürün gönderildi",
      };
    }

    return { success: false, message: "Trendyol response boş veya hatalı" };
  } catch (err) {
    console.error("TRENDYOL v2 ERROR:", err.response?.data || err.message);
    return {
      success: false,
      message: err.response?.data?.message || err.response?.data?.errorMessage || err.message,
    };
  }
}
