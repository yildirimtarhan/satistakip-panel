/**
 * Hepsiburada kargo teslim etiketi — yazdırılabilir HTML döner.
 * GET /api/hepsiburada/orders/kargo-etiket?orderNumber=XXX
 * Gönderen adı: API Ayarları → Hepsiburada → Satıcı/Mağaza adı (yoksa .env HEPSIBURADA_SENDER_NAME veya "Satıcı").
 */
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { getKargoEtiketHtml } from "@/lib/hepsiburadaKargoEtiketSablonu";

function getTokenFromRequest(req) {
  const auth = req.headers.authorization;
  if (auth && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  const cookie = req.headers.cookie;
  if (cookie) {
    const m = cookie.match(/\btoken=([^;]+)/);
    if (m) return m[1].trim();
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).setHeader("Content-Type", "application/json").json({ message: "Sadece GET" });
  }

  const orderNumber = req.query.orderNumber || req.query.packageNumber || "";
  if (!orderNumber) {
    return res
      .status(400)
      .setHeader("Content-Type", "text/html; charset=utf-8")
      .send("<html><body><p>orderNumber parametresi gerekli. Örnek: ?orderNumber=HB-12345</p></body></html>");
  }

  try {
    const { db } = await connectToDatabase();

    let senderName = process.env.HEPSIBURADA_SENDER_NAME || "Satıcı";
    let firmaAdi = "";
    const token = getTokenFromRequest(req);
    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const companyId = decoded?.companyId || null;
        const userId = decoded?.userId;
        const querySettings = companyId ? { companyId } : { userId };
        const settingsDoc = await db.collection("settings").findOne(querySettings);
        const storeName = settingsDoc?.hepsiburada?.storeName || "";
        if (storeName) senderName = storeName;
        const getQueryCompany = companyId ? { $or: [ { companyId: String(companyId) }, { userId: String(userId) } ] } : { userId: String(userId) };
        const companyDoc = await db.collection("company_settings").findOne(getQueryCompany);
        firmaAdi = companyDoc?.firmaAdi || "";
      } catch (_) {}
    }

    const col = db.collection("hb_orders");
    const doc = await col.findOne({
      $or: [{ orderNumber: String(orderNumber) }, { "data.orderNumber": String(orderNumber) }],
    });

    const data = doc?.data || doc?.raw || {};
    const ship = data.shippingAddress || data.shipmentAddress || {};

    const labelData = {
      orderNumber: data.orderNumber || doc?.orderNumber || orderNumber,
      packageNumber: data.packageNumber || doc?.packageNumber || data.orderNumber || orderNumber,
      trackingNumber: data.shipmentTrackingNumber || data.trackingInfoCode || doc?.trackingNumber || "",
      trackingInfoUrl: data.trackingInfoUrl || "",
      cargoCompany: data.cargoCompany || "Hepsiburada Kargo",
      recipientName: ship.recipientName || ship.fullName || ship.name || data.recipientName || "Alıcı",
      address: ship.address || ship.line1 || "",
      district: ship.district || ship.town || "",
      city: ship.city || ship.province || "",
      phone: ship.phone || ship.gsm || ship.mobile || data.phone || "",
      senderName,
      firmaAdi,
    };

    const html = getKargoEtiketHtml(labelData);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(html);
  } catch (err) {
    console.error("Kargo etiket hatası:", err);
    return res
      .status(500)
      .setHeader("Content-Type", "text/html; charset=utf-8")
      .send(`<html><body><p>Etiket oluşturulamadı: ${escape(String(err.message))}</p></body></html>`);
  }
}
