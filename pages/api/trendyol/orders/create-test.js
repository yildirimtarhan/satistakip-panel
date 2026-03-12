/**
 * Trendyol Test Siparişi Oluşturma
 * Doküman: https://developers.trendyol.com/reference/createtestorder
 * POST /test/order/orders/core — sadece Stage ortamında çalışır (TR).
 * Ürünler onaylı olmalı; barcode ile eşleşen ürün kullanılır.
 */
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { testOrderCoreUrl } from "@/lib/marketplaces/trendyolConfig";

const DEFAULT_ORDER = {
  customer: {
    customerFirstName: "Test",
    customerLastName: "Müşteri",
  },
  invoiceAddress: {
    addressText: "Test Adresi, İstanbul",
    city: "İstanbul",
    district: "Kadıköy",
    email: "test@test.com",
    invoiceFirstName: "Test",
    invoiceLastName: "Müşteri",
    phone: "5551234567",
    postalCode: "34000",
  },
  shippingAddress: {
    addressText: "Test Adresi, İstanbul",
    city: "İstanbul",
    district: "Kadıköy",
    email: "test@test.com",
    phone: "5551234567",
    postalCode: "34000",
    shippingFirstName: "Test",
    shippingLastName: "Müşteri",
  },
  lines: [
    { barcode: "8690000000000", quantity: 1, discountPercentage: 0 },
  ],
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Sadece POST desteklenir." });
  }

  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({
      success: false,
      message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol.",
    });
  }

  const url = testOrderCoreUrl();
  if (!url.includes("stageapigw") && !url.includes("stageapi")) {
    return res.status(400).json({
      success: false,
      message: "Test siparişi sadece Stage ortamında oluşturulabilir. TRENDYOL_BASE_URL stageapigw olmalı.",
    });
  }

  try {
    const body = req.body?.lines ? req.body : { ...DEFAULT_ORDER, ...req.body };
    if (!body.lines?.length) {
      return res.status(400).json({
        success: false,
        message: "En az 1 satır (barcode, quantity) gerekli. Örn: { lines: [{ barcode: \"ÜRÜN_BARKODU\", quantity: 1 }] }",
      });
    }

    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
    const storeFrontCode = process.env.TRENDYOL_STORE_FRONT_CODE || "TR";
    const userAgent = process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0";

    const fetchRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "User-Agent": userAgent,
        sellerId: String(creds.supplierId),
        storeFrontCode,
      },
      body: JSON.stringify(body),
    });

    const text = await fetchRes.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({
        success: false,
        message: data?.message || "Test siparişi oluşturulamadı.",
        detail: data,
      });
    }

    return res.status(200).json({
      success: true,
      orderNumber: data.orderNumber || data.orderId,
      message: "Test siparişi oluşturuldu. Trendyol Siparişleri sayfasından Yenile ile görüntüleyebilirsiniz.",
      data,
    });
  } catch (e) {
    console.error("Trendyol test order error:", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Sunucu hatası",
    });
  }
}
