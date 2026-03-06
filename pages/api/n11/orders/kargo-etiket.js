/**
 * N11 kargo etiketi — ortak pazaryeri şablonu (10x15 cm).
 * GET /api/n11/orders/kargo-etiket?orderNumber=XXX
 */
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { n11GetOrders } from "@/lib/marketplaces/n11Service";
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = String(decoded.userId || decoded._id || "");
    const companyId = decoded.companyId ? String(decoded.companyId) : null;

    const { db } = await connectToDatabase();
    const companyQuery = companyId ? { $or: [{ companyId }, { userId }] } : { userId };
    const company = await db.collection("company_settings").findOne(companyQuery);
    const firmaAdi = company?.firmaAdi || "";
    const settingsDoc = await db.collection("settings").findOne(companyId ? { companyId } : { userId });
    const senderName = settingsDoc?.n11?.storeName || company?.firmaAdi || "Satıcı";

    const result = await n11GetOrders({
      companyId: decoded.companyId,
      userId,
      searchData: { orderNumber: String(orderNumber) },
      pagingData: { currentPage: 0, pageSize: 1 },
    });
    const order = result?.orders?.[0];
    if (!order) {
      return res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Sipariş bulunamadı: " + orderNumber + "</p>");
    }

    const addr = order.shippingAddress || order.deliveryAddress || order.address || {};
    const buyerName = order.buyer?.fullName || order.buyerName || order.recipient || "Alıcı";
    const address = addr.address || addr.line1 || addr.street || "";
    const district = addr.district || addr.town || addr.neighborhood || "";
    const city = addr.city || addr.province || "";
    const phone = order.buyer?.gsm || order.buyer?.phone || addr.phone || "";
    const trackingNumber = order.cargoSenderNumber || order.trackingNumber || order.campaignCode || "";

    const labelData = {
      orderNumber: order.orderNumber || orderNumber,
      packageNumber: order.orderNumber || orderNumber,
      trackingNumber,
      cargoCompany: order.shipmentCompanyName || order.cargoCompany || "N11 Kargo",
      recipientName: buyerName,
      address,
      district,
      city,
      phone,
      senderName,
      firmaAdi,
    };

    const html = getPazaryeriKargoEtiketHtml(labelData, { marketplace: "n11" });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(html);
  } catch (err) {
    console.error("N11 kargo etiket:", err);
    return res
      .status(500)
      .setHeader("Content-Type", "text/html; charset=utf-8")
      .send("<p>Etiket oluşturulamadı: " + (err.message || "Hata") + "</p>");
  }
}
