/**
 * Hepsiburada kargo teslim etiketi — yazdırılabilir HTML döner.
 * GET /api/hepsiburada/orders/kargo-etiket?orderNumber=XXX
 * Sipariş hb_orders veya query'den alınır; getKargoEtiketHtml ile HTML üretilir.
 */
import { connectToDatabase } from "@/lib/mongodb";
import { getKargoEtiketHtml } from "@/lib/hepsiburadaKargoEtiketSablonu";

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
      senderName: process.env.HEPSIBURADA_SENDER_NAME || "Satıcı",
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
