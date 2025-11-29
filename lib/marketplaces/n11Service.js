import axios from "axios";

// -----------------------------------------
// 1) ÜRÜN OLUŞTURMA (CREATE PRODUCT)
// -----------------------------------------
export async function n11CreateProduct(product) {
  try {
    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_APP_SECRET;
    const BASE_URL = "https://api.n11.com/rest";

    const n11Body = {
      title: product.name,
      description: product.description,
      productSellerCode: product.sku || product._id.toString(),
      brandId: product.marketplaceSettings?.n11?.brandId,
      categoryId: product.marketplaceSettings?.n11?.categoryId,
      preparingDay: product.marketplaceSettings?.n11?.preparingDay || 3,
      domestic: product.marketplaceSettings?.n11?.domestic,
      shipmentTemplate: product.marketplaceSettings?.n11?.shipmentTemplate || "",
      stockItems: [
        {
          sellerStockCode: product.sku,
          quantity: product.stock,
          optionPrice: product.priceTl,
          attributes: product.marketplaceSettings?.n11?.attributes || []
        }
      ],
      images: product.images?.map((url, i) => ({
        order: i + 1,
        url
      }))
    };

    const response = await axios.post(
      `${BASE_URL}/productService/product/create`,
      n11Body,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(APP_KEY + ':' + APP_SECRET).toString("base64")}`,
          "User-Agent": "SatistakipERP/1.0"
        }
      }
    );

    const data = response.data;

    if (data.status !== "success") {
      return {
        success: false,
        message: data.error?.message || "N11 ürün yüklenemedi"
      };
    }

    // ✔ N11 REST Artık Task ID döndürür
    return {
      success: true,
      taskId: data.data?.taskId || null,
      message: "Ürün N11'e gönderildi, onay sürecinde"
    };

  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.error?.message || err.message
    };
  }
}



// ----------------------------------------------------
// 2) ✔ ÜRÜN ONAY DURUMUNU KONTROL EDEN FONKSİYON
// ----------------------------------------------------
export async function n11GetApprovalStatus(taskId) {
  try {
    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_APP_SECRET;
    const BASE_URL = "https://api.n11.com/rest";

    const response = await axios.get(
      `${BASE_URL}/productService/product/task/${taskId}`,
      {
        headers: {
          "Authorization": `Basic ${Buffer.from(APP_KEY + ':' + APP_SECRET).toString("base64")}`,
          "User-Agent": "SatistakipERP/1.0"
        }
      }
    );

    const data = response.data;

    if (data.status !== "success") {
      return {
        success: false,
        message: data.error?.message || "N11 task durumu alınamadı"
      };
    }

    return {
      success: true,
      taskStatus: data.data?.taskStatus,    // PENDING | COMPLETED | ERROR
      productId: data.data?.productId || null,
      errorReason: data.data?.errorReason || null
    };

  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.error?.message || err.message
    };
  }
}
