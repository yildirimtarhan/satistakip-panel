/**
 * Pazarama kargo etiketi — A5 boyutunda satıcı, alıcı, adres, kargo ve kampanya bilgisi.
 * GET /api/pazarama/orders/kargo-etiket?orderNumber=XXX
 */
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetOrders } from "@/lib/marketplaces/pazaramaService";
import { getPazaryeriKargoEtiketA5Html } from "@/lib/pazaryeriKargoEtiketA5";

function getTokenFromRequest(req) {
  const auth = req.headers?.authorization;
  if (auth && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  const cookie = req.headers?.cookie;
  if (cookie) {
    const m = cookie.match(/\btoken=([^;]+)/);
    if (m) return m[1].trim();
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Sadece GET destekleniyor.</p>");
  }

  const orderNumber = req.query.orderNumber || req.query.orderId || "";
  if (!String(orderNumber).trim()) {
    return res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>orderNumber parametresi gerekli. Örnek: ?orderNumber=735071747</p>");
  }

  try {
    const creds = await getPazaramaCredentials(req);
    if (!creds?.apiKey || !creds?.apiSecret) {
      return res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Pazarama API bilgileri eksik. API Ayarları → Pazarama.</p>");
    }

    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - 180);
    const start = past.toISOString().slice(0, 10) + "T00:00:00";
    const end = now.toISOString().slice(0, 10) + "T23:59:59";

    const data = await pazaramaGetOrders(creds, start, end, 1, 10, String(orderNumber).trim(), null);
    const orders = data?.data || data?.orders || [];
    const order = Array.isArray(orders) && orders.length ? orders[0] : null;
    if (!order) {
      return res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Sipariş bulunamadı.</p>");
    }

    const ship = order.shippingAddress || order.shipmentAddress || order.address || {};
    const address = ship.address || ship.fullAddress || ship.addressLine1 || order.shippingAddressLine || "";
    const district = ship.district || ship.town || "";
    const city = ship.city || ship.province || "";
    const phone = ship.phone || ship.gsm || order.customerPhone || "";

    let firmaAdi = "";
    let senderAddress = "";
    let senderPhone = "";
    const token = getTokenFromRequest(req);
    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const companyId = decoded?.companyId || null;
        const { db } = await connectToDatabase();
        const companyDoc = await db.collection("company_settings").findOne(
          companyId ? { companyId: String(companyId) } : { userId: String(decoded?.userId || "") }
        );
        if (companyDoc) {
          firmaAdi = companyDoc.firmaAdi || "";
          senderAddress = [companyDoc.adres, companyDoc.ilce, companyDoc.il].filter(Boolean).join(", ");
          senderPhone = companyDoc.telefon || companyDoc.gsm || "";
        }
      } catch (_) {}
    }

    const labelData = {
      orderNumber: order.orderNumber || order.orderId || orderNumber,
      trackingNumber: order.trackingNumber || order.cargoTrackingNumber || order.trackingInfoCode || "",
      cargoCompany: order.cargoCompany || "Pazarama Kargo",
      cargoCampaign: "Pazarama Siparişi",
      recipientName: order.customerName || order.recipientName || "Alıcı",
      address,
      district,
      city,
      phone,
      senderName: "Satıcı",
      senderAddress,
      senderPhone,
      firmaAdi,
    };

    const html = getPazaryeriKargoEtiketA5Html(labelData, { marketplace: "pazarama" });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(html);
  } catch (err) {
    console.error("[Pazarama] Kargo etiket:", err);
    return res
      .status(500)
      .setHeader("Content-Type", "text/html; charset=utf-8")
      .send(`<html><body><p>Etiket oluşturulamadı: ${String(err.message).replace(/</g, "&lt;")}</p></body></html>`);
  }
}
