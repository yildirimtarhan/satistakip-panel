// 📁 /lib/marketplaces/trendyolService.js
import axios from "axios";

export async function trendyolCreateProduct(product) {
  try {
    const SUPPLIER_ID = process.env.TRENDYOL_SUPPLIER_ID;
    const API_KEY = process.env.TRENDYOL_API_KEY;
    const API_SECRET = process.env.TRENDYOL_API_SECRET;

    const BASE_URL = `https://api.trendyol.com/sapigw/suppliers/${SUPPLIER_ID}`;

    if (!API_KEY || !API_SECRET) {
      return { success: false, message: "Trendyol API bilgileri eksik!" };
    }

    // 🔹 PARENT SKU
    const parentSku = product.sku || product._id.toString();

    // 🔹 Trendyol ürün body (Parent + Varyantlar)
    const trendyolBody = {
      items: [
        {
          product: {
            title: product.name,
            brandId: product.marketplaceSettings?.trendyol?.brandId,
            categoryId: product.marketplaceSettings?.trendyol?.categoryId,
            description: product.description,
            attributes: product.marketplaceSettings?.trendyol?.attributes || []
          },
          stockCode: parentSku,
          barcode: product.barcode || "",
          dimensionalWeight: 1,
          quantity: product.stock || 0,
          salePrice: product.priceTl,
          listPrice: product.discountPriceTl || product.priceTl,
          cargoCompanyId: product.marketplaceSettings?.trendyol?.cargoCompanyId,
          images: product.images?.map((url) => ({ url })) ?? [],

          // 🔥 VARYANTLAR BURADA
          variants: product.variants?.map((v) => ({
            barcode: v.barcode,
            sku: v.sku,
            quantity: v.stock,
            salePrice: v.priceTl,
            listPrice: v.priceTl,
            attributes: [
              {
                attributeId: 338, // Renk özelliği id (örnek)
                customAttributeValue: v.color
              },
              {
                attributeId: 339, // Beden özelliği id (örnek)
                customAttributeValue: v.size
              }
            ]
          })) || []
        }
      ]
    };

    const response = await axios.post(
      `${BASE_URL}/products`,
      trendyolBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(API_KEY + ":" + API_SECRET).toString("base64")
        }
      }
    );

    if (response.data?.batchRequestId) {
      return {
        success: true,
        productId: response.data.batchRequestId,
        message: "Trendyol’a varyantlı ürün gönderildi"
      };
    }

    return {
      success: false,
      message: "Trendyol response boş veya hatalı"
    };

  } catch (err) {
    console.error("TRENDYOL ERROR:", err.response?.data || err.message);

    return {
      success: false,
      message: err.response?.data?.errorMessage || err.message
    };
  }
}
