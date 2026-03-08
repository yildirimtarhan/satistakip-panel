/**
 * POST /api/hepsiburada/webhook
 *
 * Hepsiburada'nin gonderecegi siparis/urun olaylarini alir.
 * Basic Auth ile guvenlik saglanir:
 *   Authorization: Basic base64(HB_WEBHOOK_USERNAME:HB_WEBHOOK_PASSWORD)
 *
 * Transaction Types:
 *   - ORDER_CREATED
 *   - ORDER_STATUS_CHANGED
 *   - ORDER_LINE_CANCELLATION
 *   - CLAIM_CREATED
 */

import { connectToDatabase } from "@/lib/mongodb";

function verifyBasicAuth(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");
  return (
    user === process.env.HB_WEBHOOK_USERNAME &&
    pass === process.env.HB_WEBHOOK_PASSWORD
  );
}

export default async function handler(req, res) {
  // Health-check — HB webhook kaydi sirasinda GET atar
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", service: "satistakip-hepsiburada-webhook" });
  }

  if (req.method !== "POST") return res.status(405).end();

  // Auth dogrulama
  if (!verifyBasicAuth(req)) {
    console.warn("HB Webhook: Yetkisiz erisim denemesi");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const payload = req.body;
  const transactionType = payload?.transactionType || payload?.eventType || "UNKNOWN";
  console.log(`HB Webhook alindi: ${transactionType}`, JSON.stringify(payload).substring(0, 500));

  try {
    const { db } = await connectToDatabase();

    // Olayi webhook_logs koleksiyonuna kaydet
    await db.collection("webhook_logs").insertOne({
      source: "hepsiburada",
      transactionType,
      payload,
      receivedAt: new Date(),
    });

    // Siparis olaylari
    if (
      transactionType === "ORDER_CREATED" ||
      transactionType === "ORDER_STATUS_CHANGED" ||
      transactionType === "ORDER_LINE_CANCELLATION"
    ) {
      await handleOrderEvent(db, transactionType, payload);
    }

    return res.status(200).json({ status: "received", transactionType });
  } catch (err) {
    console.error("HB Webhook hata:", err.message);
    return res.status(500).json({ message: "Internal error" });
  }
}

async function handleOrderEvent(db, type, payload) {
  const orders = payload?.orders || (payload?.orderId ? [payload] : []);

  for (const order of orders) {
    const orderId = order.orderId || order.id;
    if (!orderId) continue;

    await db.collection("hb_orders").updateOne(
      { orderId },
      {
        $set: {
          orderId,
          status: order.status || order.orderStatus,
          lastEvent: type,
          updatedAt: new Date(),
          rawData: order,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }
}
