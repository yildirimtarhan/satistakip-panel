/**
 * Trendyol API test scripti.
 * Çalıştırma: npm run test:trendyol  veya  node scripts/trendyol-test.js
 * .env veya .env.local'de TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY, TRENDYOL_API_SECRET tanımlı olmalı (gerçek API çağrısı için).
 */
const path = require("path");
const fs = require("fs");

// .env yükle (proje kökünden)
function loadEnv() {
  const root = path.resolve(__dirname, "..");
  for (const name of [".env.local", ".env"]) {
    const file = path.join(root, name);
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      content.split("\n").forEach((line) => {
        const m = line.match(/^\s*([^#=]+)=(.*)$/);
        if (m) {
          const key = m[1].trim();
          const val = m[2].trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) process.env[key] = val;
        }
      });
      console.log("📁 Ortam:", name);
      break;
    }
  }
}

loadEnv();

// Trendyol config (lib ile aynı mantık)
const TRENDYOL_BASE_PROD = "https://apigw.trendyol.com/integration";
const TRENDYOL_BASE_STAGE = "https://stageapigw.trendyol.com/integration";

function getTrendyolBase() {
  const url = process.env.TRENDYOL_BASE_URL;
  if (url) return url.replace(/\/$/, "");
  return process.env.NODE_ENV === "production" && !process.env.TRENDYOL_USE_STAGE
    ? TRENDYOL_BASE_PROD
    : TRENDYOL_BASE_STAGE;
}

function ordersListUrl(sellerId) {
  return `${getTrendyolBase()}/order/sellers/${sellerId}/orders`;
}

const supplierId = process.env.TRENDYOL_SUPPLIER_ID || "2738";
const apiKey = process.env.TRENDYOL_API_KEY;
const apiSecret = process.env.TRENDYOL_API_SECRET;
const base = getTrendyolBase();

console.log("\n=== Trendyol URL ve bağlantı testi ===\n");
console.log("1. Base URL (kullanılan):", base);
console.log("   Stage (beklenen):     ", TRENDYOL_BASE_STAGE);
console.log("   Canlı (beklenen):     ", TRENDYOL_BASE_PROD);
console.log("   Eşleşme:", base === TRENDYOL_BASE_STAGE ? "✅ Stage" : base === TRENDYOL_BASE_PROD ? "✅ Canlı" : "⚠️ Özel TRENDYOL_BASE_URL");

console.log("\n2. Örnek endpoint'ler (sellerId=" + supplierId + "):");
console.log("   Sipariş listesi:", ordersListUrl(supplierId));
console.log("   Ürün listesi:   ", base + "/product/sellers/" + supplierId + "/products");
console.log("   Fiyat/stok:     ", base + "/inventory/sellers/" + supplierId + "/products/price-and-inventory");

// Sadece URL kontrolü: npm run test:trendyol -- --url-only
const urlOnly = process.argv.includes("--url-only");
if (!apiKey || !apiSecret || urlOnly) {
  if (urlOnly) console.log("\n3. API çağrısı: ⏭️ Atlandı (--url-only)");
  else console.log("\n3. API çağrısı: ⏭️ Atlandı (TRENDYOL_API_KEY / TRENDYOL_API_SECRET .env'de yok)");
  console.log("   Gerçek bağlantı testi için .env'e bilgileri ekleyip tekrar çalıştırın.");
  console.log("   Stage ortamında 403 alırsanız IP yetkisi gerekebilir (docs/TRENDYOL-TEST-ORTAMI.md).\n");
  process.exit(0);
}

// Gerçek API çağrısı
const startDate = Date.now() - 7 * 24 * 60 * 60 * 1000;
const endDate = Date.now();
const url = `${ordersListUrl(supplierId)}?startDate=${startDate}&endDate=${endDate}&size=1`;
const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
const userAgent = process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0";

console.log("\n3. Trendyol API bağlantı testi (GET sipariş listesi, size=1)...");
console.log("   URL:", url);

fetch(url, {
  method: "GET",
  headers: {
    Authorization: `Basic ${auth}`,
    "User-Agent": userAgent,
    "Content-Type": "application/json",
  },
})
  .then(async (res) => {
    const text = await res.text();
    if (res.ok) {
      console.log("   Sonuç: ✅ HTTP", res.status, "— Bağlantı başarılı.");
      try {
        const data = JSON.parse(text);
        const total = data.totalElements ?? data.content?.length ?? 0;
        console.log("   Sipariş sayısı (son 7 gün):", total);
      } catch (_) {}
    } else {
      console.log("   Sonuç: ❌ HTTP", res.status);
      console.log("   Yanıt:", text.slice(0, 300));
      if (res.status === 401) {
        console.log("\n   💡 401: API Key / API Secret kontrol edin (Stage: Hesap Bilgilerim).");
      }
      if (res.status === 403 || text.includes("blocked") || text.includes("<html")) {
        console.log("\n   💡 403/HTML: Test ortamında IP yetkisi gerekebilir (docs/TRENDYOL-TEST-ORTAMI.md).");
      }
    }
    console.log("");
    process.exit(res.ok ? 0 : 1);
  })
  .catch((err) => {
    console.log("   Sonuç: ❌ Hata:", err.message);
    console.log("\n   💡 Ağ hatası veya DNS. URL'nin erişilebilir olduğundan emin olun.\n");
    process.exit(1);
  });
