/**
 * Hepsiburada test ortamında manuel sipariş oluşturma.
 * POST https://oms-stub-external-sit.hepsiburada.com/orders/merchantId/{merchantId}
 * Sadece test hesabında kullanılır; canlıda bu endpoint yoktur.
 */
import jwt from "jsonwebtoken";
import { getHBSettings, getHBToken } from "@/lib/marketplaces/hbService";

const STUB_URL = "https://oms-stub-external-sit.hepsiburada.com";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Sadece POST" });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.authToken) {
      return res.status(400).json({ success: false, message: "Hepsiburada ayarları eksik (API Ayarlarından Merchant ID ve şifre girin)" });
    }

    const tokenObj = await getHBToken(cfg);
    const authHeader = `${tokenObj.type} ${tokenObj.value}`;

    const body = req.body || {};
    const orderNumber = body.orderNumber || String(Math.floor(1000000000 + Math.random() * 9000000000));
    const orderDate = body.orderDate || new Date().toISOString();
    const merchantSku = body.merchantSku || "TEST-SKU-001";
    const sku = body.sku || body.hepsiburadaSku || "HBV00001065YF";
    const quantity = Math.max(1, parseInt(body.quantity, 10) || 1);
    const amount = Math.max(0, parseFloat(body.amount) || 100);

    const orderPayload = {
      OrderNumber: orderNumber,
      OrderDate: orderDate,
      PaymentStatus: "Paid",
      Customer: body.customer || {
        CustomerId: "dfc8a27f-faae-4cb2-859c-8a7d50ee77be",
        Name: "Test User",
      },
      DeliveryAddress: body.deliveryAddress || {
        AddressId: "e66765b3-d37d-488c-ae15-47051245dc9b",
        Name: "Hepsiburada Office",
        AddressDetail: "Trump Towers",
        Email: "customer@hepsiburada.com.tr",
        CountryCode: "TR",
        PhoneNumber: "902822613231",
        AlternatePhoneNumber: "045321538212",
        District: "Kustepe",
        City: "İstanbul",
      },
      LineItems: [
        {
          Sku: sku,
          MerchantId: cfg.merchantId,
          MerchantSku: merchantSku,
          Quantity: quantity,
          Price: { Amount: amount, Currency: "TRY" },
          Vat: 0,
          TotalPrice: { Amount: amount * quantity, Currency: "TRY" },
          CargoCompanyId: body.cargoCompanyId ?? 89100,
          DeliveryOptionId: 1,
          TagList: ["dijital-urunler"],
        },
      ],
    };

    const url = `${STUB_URL}/orders/merchantId/${encodeURIComponent(cfg.merchantId)}`;
    const hbRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "User-Agent": cfg.userAgent || "SatisTakip/1.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const text = await hbRes.text();
    let responseJson = null;
    try {
      responseJson = JSON.parse(text);
    } catch (_) {}

    return res.status(hbRes.ok ? 200 : hbRes.status).json({
      success: hbRes.ok,
      orderNumber,
      message: hbRes.ok
        ? "Test siparişi oluşturuldu. Sipariş listesini yenileyebilir veya webhook ile panelde görünebilir."
        : (responseJson?.message || text),
      response: responseJson ?? text,
    });
  } catch (err) {
    console.error("HB CREATE TEST ORDER ERROR:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
