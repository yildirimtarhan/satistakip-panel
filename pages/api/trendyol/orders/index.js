// 📄 /pages/api/trendyol/orders/index.js
// Güncel API: https://developers.trendyol.com — GET /order/sellers/{sellerId}/orders
import { ordersListUrl } from "@/lib/marketplaces/trendyolConfig";
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";

export default async function handler(req, res) {
  try {
    const creds = await getTrendyolCredentials(req);
    if (!creds) {
      return res.status(400).json({
        success: false,
        message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol bölümünden girin.",
      });
    }
    const { supplierId, apiKey, apiSecret } = creds;
    const userAgent = process.env.TRENDYOL_USER_AGENT || "satistakip_online";
    const storeFrontCode = process.env.TRENDYOL_STORE_FRONT_CODE;

    const now = Date.now();
    const startDate = now - 1000 * 60 * 60 * 24 * 3; // Son 3 gün
    const endDate = now;

    const url = `${ordersListUrl(supplierId)}?status=Created&startDate=${startDate}&endDate=${endDate}&size=50&orderByField=PackageLastModifiedDate&orderByDirection=DESC`;

    const authToken = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const headers = {
      "User-Agent": userAgent,
      "Authorization": `Basic ${authToken}`,
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json",
    };
    if (storeFrontCode) headers["storeFrontCode"] = storeFrontCode;

    console.log("📡 Trendyol Orders API:", url);

    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Trendyol Orders API hatası:", text);
      const is401 = response.status === 401;
      const message = is401
        ? "Trendyol yetki hatası (401). API Key ve API Secret'ı Stage panel (Hesap Bilgilerim) veya canlı panelden yeniden kopyalayıp API Ayarları → Trendyol bölümüne girin."
        : "Trendyol API erişimi başarısız.";
      return res.status(response.status).json({
        success: false,
        message,
        error: text?.slice?.(0, 300),
      });
    }

    const data = await response.json();
    // Yeni API: { content: [paketler], totalElements, totalPages, page, size }
    // Trendyol Dec 2025: totalPrice→packageTotalPrice, grossAmount→packageGrossAmount; eski alanlar da desteklensin
    const raw = data.content ?? data.orders ?? (Array.isArray(data) ? data : []);
    const orders = raw.map((p) => ({
      id: p.orderNumber ?? p.shipmentPackageId ?? p.id,
      customerName: [p.customerFirstName, p.customerLastName].filter(Boolean).join(" ") || p.customerEmail || "—",
      productName: p.lines?.[0]?.productName ?? p.lines?.[0]?.productCode ?? "—",
      status: p.status ?? p.shipmentPackageStatus ?? "—",
      createdDate: p.orderDate ? new Date(p.orderDate).toISOString() : p.createdDate,
      salePrice: p.packageTotalPrice ?? p.totalPrice ?? p.packageGrossAmount ?? p.grossAmount,
      purchasePrice: null,
      trackingNumber: p.cargoTrackingNumber ?? p.trackingNumber ?? null,
    }));
    return res.status(200).json({ success: true, orders, totalElements: data.totalElements, totalPages: data.totalPages, page: data.page });
  } catch (error) {
    console.error("🔥 Trendyol Orders API hata:", error);
    return res.status(500).json({
      success: false,
      message: "Trendyol API bağlantı hatası.",
      error: error.message,
    });
  }
}
