import axios from "axios";

export async function n11CreateProduct(product) {
  try {
    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_APP_SECRET;

    if (!APP_KEY || !APP_SECRET) {
      return { success: false, message: "N11 API bilgileri eksik" };
    }

    // 🔥 N11 REST Batch Product Endpoint
    const url = "https://api.n11.com/rest/secure/batchProductService";

    // Ürün ERP'den geliyor:
    const {
      name,
      sku,
      barcode,
      brand,
      description,
      priceTl,
      vatRate,
      stock,
      images,
      marketplaceSettings,
    } = product;

    // N11 ayarları
    const n11 = marketplaceSettings?.n11 || {};

    // 🔥 N11'e gönderilecek ürün datası
    const payload = {
      items: [
        {
          productSellerCode: sku,
          productName: name,
          brandId: n11.brandId,
          categoryId: n11.categoryId,
          description: description,
          attributes: n11.attributes || {},
          preparingDay: n11.preparingDay,
          domestic: n11.domestic,
          stockItems: [
            {
              sellerStockCode: sku,
              barcode: barcode || "",
              price: Number(priceTl),
              quantity: Number(stock),
              currencyType: "TL",
            },
          ],
          images:
            images?.length > 0
              ? images.map((img) => ({ url: img }))
              : [],
        },
      ],
    };

    const headers = {
      "Content-Type": "application/json",
      "appKey": APP_KEY,
      "appSecret": APP_SECRET,
    };

    // 🔥 API isteği
    const response = await axios.post(url, payload, { headers });

    return {
      success: true,
      message: "N11 ürün gönderimi iletildi",
      raw: response.data,
    };
  } catch (err) {
    console.error("N11 PRODUCT CREATE ERROR:", err?.response?.data || err);
    return {
      success: false,
      message: "N11 ürün gönderilemedi",
      error: err.message,
    };
  }
}
// ------------------------------------------------------
// 🟦 Dummy n11 Get Approval Status Function
// Render deploy sırasında eksik export hatasını önler
// Bu fonksiyon gerçek API ile daha sonra entegre edilebilir.
// ------------------------------------------------------
export async function n11GetApprovalStatus(productId) {
  try {
    return {
      success: true,
      status: "Approved",
      productId,
      message: "Dummy approval status returned."
    };
  } catch (err) {
    return {
      success: false,
      status: "Error",
      productId,
      message: err.message || "Unknown error"
    };
  }
}
