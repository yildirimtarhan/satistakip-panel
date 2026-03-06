/**
 * Trendyol kargo etiketi — ortak pazaryeri şablonu (10x15 cm).
 * GET /api/trendyol/orders/kargo-etiket?orderNumber=XXX
 */
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { ordersListUrl } from "@/lib/marketplaces/trendyolConfig";
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { getPazaryeriKargoEtiketHtml } from "@/lib/pazaryeriKargoEtiketSablonu";

function getToken(req) {
  const auth = req.headers.authorization;
  if (auth && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  const cookie = req.headers.cookie;
  if (cookie) {
    const m = cookie.match(/\btoken=([^;]+)/);
    if (m) return decodeURIComponent(m[1].trim());
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Sadece GET</p>");
  }
  const orderNumber = req.query.orderNumber || req.query.orderId || "";
  if (!orderNumber) {
    return res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>orderNumber gerekli</p>");
  }

  try {
    const token = getToken(req);
    if (!token || !process.env.JWT_SECRET) {
      return res.status(401).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Oturum gerekli. Giriş yapıp tekrar deneyin.</p>");
    }
    jwt.verify(token, process.env.JWT_SECRET);

    const creds = await getTrendyolCredentials(req);
    if (!creds) {
      return res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Trendyol API ayarları eksik.</p>");
    }

    const { db } = await connectToDatabase();
    const decoded = jwt.decode(token);
    const userId = String(decoded?.userId || decoded?._id || "");
    const companyId = decoded?.companyId ? String(decoded.companyId) : null;
    const companyQuery = companyId ? { $or: [{ companyId }, { userId }] } : { userId };
    const company = await db.collection("company_settings").findOne(companyQuery);
    const firmaAdi = company?.firmaAdi || "";
    const senderName = company?.firmaAdi || "Satıcı";

    const { supplierId, apiKey, apiSecret } = creds;
    const userAgent = process.env.TRENDYOL_USER_AGENT || "satistakip_online";
    const now = Date.now();
    const startDate = now - 1000 * 60 * 60 * 24 * 90;
    const endDate = now;
    const url = `${ordersListUrl(supplierId)}?startDate=${startDate}&endDate=${endDate}&size=100&orderByField=PackageLastModifiedDate&orderByDirection=DESC`;
    const authToken = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const headers = { "User-Agent": userAgent, "Authorization": `Basic ${authToken}`, "Accept": "application/json", "Content-Type": "application/json" };
    if (process.env.TRENDYOL_STORE_FRONT_CODE) headers["storeFrontCode"] = process.env.TRENDYOL_STORE_FRONT_CODE;

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      return res.status(502).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Trendyol sipariş listesi alınamadı.</p>");
    }
    const data = await response.json();
    const content = data.content ?? data.orders ?? (Array.isArray(data) ? data : []);
    const pkg = content.find((p) => String(p.orderNumber || p.id || "") === String(orderNumber));
    if (!pkg) {
      return res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Sipariş bulunamadı: " + orderNumber + "</p>");
    }

    const customerName = [pkg.customerFirstName, pkg.customerLastName].filter(Boolean).join(" ") || pkg.customerEmail || "Alıcı";
    const addr = pkg.shipmentAddress || pkg.address || {};
    const address = addr.addressLine1 || addr.address || addr.line1 || "";
    const district = addr.district || addr.town || "";
    const city = addr.city || addr.province || "";
    const phone = pkg.customerPhone || addr.phone || "";
    const trackingNumber = pkg.cargoTrackingNumber || pkg.trackingNumber || "";

    const labelData = {
      orderNumber: pkg.orderNumber || orderNumber,
      packageNumber: pkg.packageNumber || pkg.orderNumber || orderNumber,
      trackingNumber,
      cargoCompany: pkg.cargoProviderName || "Trendyol Kargo",
      recipientName: customerName,
      address,
      district,
      city,
      phone,
      senderName,
      firmaAdi,
    };

    const html = getPazaryeriKargoEtiketHtml(labelData, { marketplace: "trendyol" });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(html);
  } catch (err) {
    console.error("Trendyol kargo etiket:", err);
    return res.status(500).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Etiket oluşturulamadı: " + (err.message || "Hata") + "</p>");
  }
}
