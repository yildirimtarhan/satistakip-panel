// pages/api/hepsiburada-api/orders/local.js
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const col = db.collection("hb_orders");

    const docs = await col
      .find({})
      .sort({ fetchedAt: -1 })
      .limit(100)
      .toArray();

    // ✅ Eğer DB'de kayıt yoksa örnek test siparişi döndür
    if (!docs || docs.length === 0) {
      console.log("📦 HB Local: DB boş → Test siparişi dönülüyor");

      const testOrder = [
        {
          orderNumber: "TEST-HB-ORDER-123456",
          status: "AwaitingShipment",
          updatedAt: new Date().toISOString(),
          trackingNumber: "TESTTRACK123456",
          shipmentTrackingNumber: "TESTTRACK123456",
          raw: {
            orderNumber: "TEST-HB-ORDER-123456",
            status: "AwaitingShipment",
            lastStatusUpdateDate: new Date().toISOString(),
            shipmentTrackingNumber: "TESTTRACK123456",
          }
        }
      ];

      return res.status(200).json({
        success: true,
        total: 1,
        orders: testOrder
      });
    }

    // ✅ DB'deki gerçek siparişleri map'le (ERP bilgisi dahil)
    const orders = docs.map((d) => ({
      orderNumber: d.data?.orderNumber || d.orderNumber,
      status: d.data?.status || d.data?.orderStatus || d.data?.deliveryStatus || "-",
      updatedAt: d.data?.lastStatusUpdateDate || d.fetchedAt,
      trackingNumber: d.data?.shipmentTrackingNumber || null,
      raw: d.data,
      erpPushed: !!d.erpPushed,
      erpSaleNo: d.erpSaleNo || null,
    }));

    return res.status(200).json({
      success: true,
      total: orders.length,
      orders
    });

  } catch (err) {
    console.error("HB → Local DB read error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
