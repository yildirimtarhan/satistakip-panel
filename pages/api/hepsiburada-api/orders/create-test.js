/**
 * Hepsiburada Test Siparişi Oluşturma
 * Doküman: https://developers.hepsiburada.com/hepsiburada/reference/post_orders-merchantid-merchantid
 * - STUB ortamına POST atar; sipariş oluştuktan sonra webhook (CreateOrderV2) tetiklenir.
 * - CargoCompanyId: 89100 (Hepsiburada talebi; portal üzerinden teslimat adımlarını ilerletebilmek için).
 * - Teslimat adımlarını portal üzerinden ilerleterek DeliveryShippedV2, DeliveryDeliveredV2 vb. test edilebilir.
 * - Env: HEPSIBURADA_MERCHANT_ID + HEPSIBURADA_AUTH (veya HB_MERCHANT_ID + HB_SECRET_KEY), HEPSIBURADA_USER_AGENT.
 */
import {
  getHepsiburadaMerchantId,
  getHepsiburadaAuth,
  getHepsiburadaUserAgent,
} from "@/lib/hepsiburadaEnv";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Only POST allowed" });

  try {
    const merchantId = getHepsiburadaMerchantId();
    const authHeader = getHepsiburadaAuth();
    if (!merchantId || !authHeader)
      return res.status(400).json({
        message:
          "HEPSIBURADA_MERCHANT_ID + HEPSIBURADA_AUTH (veya HB_MERCHANT_ID + HB_SECRET_KEY) tanımlı değil",
      });

    const now = new Date().toISOString();
    const randomOrderNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    const orderPayload = {
      OrderNumber: randomOrderNumber,
      OrderDate: now,
      PaymentStatus: "Paid",
      Customer: {
        CustomerId: "dfc8a27f-faae-4cb2-859c-8a7d50ee77be",
        Name: "Test User"
      },
      DeliveryAddress: {
        AddressId: "e66765b3-d37d-488c-ae15-47051245dc9b",
        Name: "Hepsiburada Office",
        AddressDetail: "Trump Towers",
        Email: "tigdesithalat@gmail.com",
        CountryCode: "TR",
        PhoneNumber: "902822613231",
        AlternatePhoneNumber: "045321538212",
        District: "Kustepe",
        City: "İstanbul"
      },
      LineItems: [
        {
          Sku: "HBV00001065YF",
          MerchantId: merchantId,
          MerchantSku: "TEST-SKU-001",
          Quantity: 1,
          Price: { Amount: 100, Currency: "TRY" },
          Vat: 0,
          TotalPrice: { Amount: 100, Currency: "TRY" },
          CargoCompanyId: 89100,
          DeliveryOptionId: 1,
          TagList: ["dijital-urunler"]
        }
      ]
    };

    const ua = getHepsiburadaUserAgent();
    const url = `https://oms-stub-external-sit.hepsiburada.com/orders/merchantId/${merchantId}`;

    const hbRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "User-Agent": ua,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload)
    });

    const text = await hbRes.text();
    let responseJson = null;
    try {
      responseJson = JSON.parse(text);
    } catch {
      // STUB bazen string döner
    }

    return res.status(hbRes.ok ? 200 : hbRes.status).json({
      success: hbRes.ok,
      orderNumber: randomOrderNumber,
      sent: orderPayload,
      response: responseJson ?? text,
      message: hbRes.ok
        ? "Test siparişi oluşturuldu. Webhook (CreateOrderV2) tetiklenebilir; portal üzerinden teslimat adımlarını ilerletebilirsiniz."
        : "STUB yanıtı: " + text
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
