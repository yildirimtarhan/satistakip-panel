/**
 * Trendyol tüm API modüllerini test et
 * GET /api/trendyol/test-all
 */
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import {
  ordersListUrl,
  productListUrl,
  webhooksUrl,
  supplierAddressesUrl,
  questionsFilterUrl,
  returnsUrl,
  settlementsUrl,
  getTrendyolBase,
} from "@/lib/marketplaces/trendyolConfig";

async function testEndpoint(name, url, creds, method = "GET") {
  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const userAgent = process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0";
  const headers = {
    Authorization: `Basic ${auth}`,
    "User-Agent": userAgent,
    "Content-Type": "application/json",
  };
  try {
    const r = await fetch(url, { method, headers });
    const ok = r.ok;
    let body = null;
    try {
      body = await r.json();
    } catch {
      body = await r.text();
    }
    return { name, ok, status: r.status, data: ok ? (typeof body === "object" && body?.content ? body.content.length : body) : body };
  } catch (e) {
    return { name, ok: false, status: 0, error: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Sadece GET" });
  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({
      success: false,
      message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol.",
      results: null,
    });
  }

  const base = getTrendyolBase();
  const sid = creds.supplierId;
  const now = Date.now();
  const start = now - 7 * 24 * 60 * 60 * 1000;

  const tests = [
    { name: "Sipariş Listesi", url: `${ordersListUrl(sid)}?startDate=${start}&endDate=${now}&size=1` },
    { name: "Ürün Listesi", url: `${productListUrl(sid)}?page=0&size=1` },
    { name: "Webhook Listesi", url: webhooksUrl(sid) },
    { name: "Satıcı Adresleri", url: supplierAddressesUrl(sid) },
    { name: "Sorular", url: `${questionsFilterUrl(sid)}?page=0&size=1` },
    { name: "İadeler (Claims)", url: `${returnsUrl(sid)}?page=0&size=1` },
    { name: "Muhasebe (Settlements)", url: `${settlementsUrl(sid)}?startDate=${start}&endDate=${now}&transactionType=Sale&page=0&size=1&supplierId=${sid}` },
  ];

  const results = [];
  for (const t of tests) {
    const r = await testEndpoint(t.name, t.url, creds);
    results.push(r);
  }

  const allOk = results.every((r) => r.ok);
  return res.status(200).json({
    success: allOk,
    message: allOk ? "Tüm testler başarılı" : "Bazı testler başarısız (rol/yetki gerekebilir)",
    baseUrl: base,
    supplierId: sid,
    results,
  });
}
