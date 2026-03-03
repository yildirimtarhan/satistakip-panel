/**
 * Test ortamı için örnek sipariş verisi: 2 yeni + 7 kargoda/teslim (toplam 9).
 * Panelde "Paketlenecek", "Kargoda", "Teslim edildi" sekmelerinin dolu görünmesi için kullanılır.
 */
import { connectToDatabase } from "@/lib/mongodb";
import dbConnect from "@/lib/dbConnect";
import { verifyToken } from "@/utils/auth";
import User from "@/models/User";

const now = new Date();

function makeOrder(orderNumber, status, trackingNumber = null) {
  return {
    orderNumber,
    data: {
      orderNumber,
      status,
      orderStatus: status,
      lastStatusUpdateDate: now.toISOString(),
      shipmentTrackingNumber: trackingNumber,
      shippingAddress: { recipientName: "Test Müşteri", phone: "5551234567" },
      customerEmail: "test@test.com",
      lines: [{ merchantSku: "SKU-001", quantity: 1, unitPrice: 99.9, productName: "Test Ürün" }],
    },
    fetchedAt: now,
    updatedAt: now,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Sadece POST" });
  }

  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const tokenUser = verifyToken(token);
    if (!tokenUser?.userId) {
      return res.status(401).json({ success: false, message: "Yetkisiz" });
    }
    await dbConnect();
    const dbUser = await User.findById(tokenUser.userId).select("_id");
    if (!dbUser) return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı" });

    const { db } = await connectToDatabase();
    const col = db.collection("hb_orders");

    // 2 yeni sipariş (Paketlenecek)
    const newOrders = [
      makeOrder("HB-TEST-NEW-001", "AwaitingShipment"),
      makeOrder("HB-TEST-NEW-002", "OrderCreated"),
    ];

    // 4 kargoda (Kargoda)
    const shippedOrders = [
      makeOrder("HB-TEST-SHIP-001", "Shipped", "TRK001"),
      makeOrder("HB-TEST-SHIP-002", "DeliveryShippedV2", "TRK002"),
      makeOrder("HB-TEST-SHIP-003", "InTransit", "TRK003"),
      makeOrder("HB-TEST-SHIP-004", "Shipped", "TRK004"),
    ];

    // 3 teslim edildi (Teslim edildi)
    const deliveredOrders = [
      makeOrder("HB-TEST-DEL-001", "Delivered", "TRK101"),
      makeOrder("HB-TEST-DEL-002", "DeliveryDeliveredV2", "TRK102"),
      makeOrder("HB-TEST-DEL-003", "Delivered", "TRK103"),
    ];

    const all = [...newOrders, ...shippedOrders, ...deliveredOrders];

    for (const doc of all) {
      await col.updateOne(
        { orderNumber: doc.orderNumber },
        { $set: doc },
        { upsert: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Örnek test verisi eklendi: 2 yeni, 4 kargoda, 3 teslim edildi (toplam 9 sipariş)",
      added: { new: 2, shipped: 4, delivered: 3, total: 9 },
    });
  } catch (err) {
    console.error("HB seed-test-data error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Test verisi eklenemedi",
    });
  }
}
