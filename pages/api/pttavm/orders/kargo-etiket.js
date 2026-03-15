/**
 * PTT AVM kargo etiketi — A5 boyutunda satıcı, alıcı, adres, kargo ve kampanya bilgisi.
 * GET /api/pttavm/orders/kargo-etiket?orderId=XXX
 */
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmGetOrderDetail, pttAvmGetOrderCargoInfos } from "@/lib/marketplaces/pttAvmService";
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

  const orderId = req.query.orderId || req.query.order_id || "";
  if (!String(orderId).trim()) {
    return res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>orderId parametresi gerekli. Örnek: ?orderId=PTT-12345</p>");
  }

  try {
    const creds = await getPttAvmCredentials(req);
    if (!creds?.apiKey || !creds?.accessToken) {
      return res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>PTT AVM API bilgileri eksik. API Ayarları → PTT AVM.</p>");
    }

    const [orderList, cargoList] = await Promise.all([
      pttAvmGetOrderDetail(creds, orderId),
      pttAvmGetOrderCargoInfos(creds, orderId).catch(() => []),
    ]);
    const order = Array.isArray(orderList) && orderList.length ? orderList[0] : orderList;
    if (!order) {
      return res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").send("<p>Sipariş bulunamadı.</p>");
    }

    const addr = order.siparisAdresi;
    const addressStr = typeof addr === "string" ? addr : "";
    const addressObj = typeof addr === "object" && addr !== null ? addr : {};
    const trackingFromCargo = Array.isArray(cargoList) && cargoList[0]?.referenceCode ? cargoList[0].referenceCode : null;
    const barcodes = order.barcodes;
    const trackingNumber = trackingFromCargo || (Array.isArray(barcodes) && barcodes[0]) || "";

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
      orderNumber: order.siparisNo || orderId,
      trackingNumber: String(trackingNumber || "").trim() || undefined,
      cargoCompany: "PTT Kargo",
      cargoCampaign: "PTT AVM Siparişi",
      recipientName: order.musteriAdi || order.musteri || "Alıcı",
      address: addressStr || addressObj.adres || addressObj.address,
      district: addressObj.ilce || addressObj.district,
      city: addressObj.il || addressObj.city,
      phone: order.telefon || order.phone || order.musteriTelefon,
      senderName: creds.storeName || "Satıcı",
      senderAddress,
      senderPhone,
      firmaAdi,
    };

    const html = getPazaryeriKargoEtiketA5Html(labelData, { marketplace: "pttavm" });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(html);
  } catch (err) {
    console.error("[PTT AVM] Kargo etiket:", err);
    return res
      .status(500)
      .setHeader("Content-Type", "text/html; charset=utf-8")
      .send(`<html><body><p>Etiket oluşturulamadı: ${String(err.message).replace(/</g, "&lt;")}</p></body></html>`);
  }
}
