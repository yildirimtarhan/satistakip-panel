/**
 * Hepsiburada Sipariş Webhook
 * URL: https://www.satistakip.online/api/hepsiburada-api/orders/webhook
 *
 * Tanımlı webhook tipleri: CreateOrderV2, CancelOrderLineV2,
 * DeliveryDeliveredV2, DeliveryCreated, DeliveryShippedV2, DeliveryUndeliveredV2
 * İptal webhook'unda sipariş ERP'de kayıtlıysa satış iptali (sale_cancel) oluşturulur.
 */
import { connectToDatabase } from "@/lib/mongodb";
import { createSaleCancelBySaleNoAndCompany } from "@/lib/saleCancelBySaleNo";
import { reversePazaryeriBorcBySaleNo } from "@/lib/pazaryeriCari";
import { sendNewOrderEmail } from "@/lib/emailNotifications";
import {
  getWebhookCredentials,
  getHepsiburadaMerchantId,
  getHepsiburadaAuth,
  getHepsiburadaUserAgent,
  getHepsiburadaOmsBaseUrl,
  isHepsiburadaTestMode,
} from "@/lib/hepsiburadaEnv";

const SUPPORTED_TYPES = [
  "OrderCreate",
  "OrderCreated",
  "CreateOrderV2",
  "CreateOrder",
  "CancelOrderLine",
  "CancelOrderLineV2",
  "OrderCancelled",
  "OrderUpdated",
  "DeliveryDeliveredV2",
  "DeliveryCreated",
  "DeliveryShippedV2",
  "DeliveryUndeliveredV2",
];
const ORDER_CREATE_TYPES = ["OrderCreate", "OrderCreated", "CreateOrderV2", "CreateOrder"];
const ORDER_CANCEL_TYPES = ["CancelOrderLine", "CancelOrderLineV2", "OrderCancelled"];
const DELIVERY_TYPES = ["DeliveryDeliveredV2", "DeliveryCreated", "DeliveryShippedV2", "DeliveryUndeliveredV2"];
const DELIVERY_STATUS_MAP = {
  DeliveryDeliveredV2: "Delivered",
  DeliveryCreated: "DeliveryCreated",
  DeliveryShippedV2: "Shipped",
  DeliveryUndeliveredV2: "Undelivered",
};

function getBasicAuthCredentials() {
  const { username: u, password: p } = getWebhookCredentials();
  return { u, p };
}

function validateBasicAuth(req) {
  const { u, p } = getBasicAuthCredentials();
  if (!u || !p) {
    return { ok: false, message: "Webhook Basic Auth ayarlı değil (HB_WEBHOOK_USERNAME, HB_WEBHOOK_PASSWORD)" };
  }
  const authHeader = req.headers.authorization || "";
  const expected = "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
  if (authHeader !== expected) {
    return { ok: false, message: "Unauthorized" };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  // GET: URL doğrulama / sağlık kontrolü (Hepsiburada bazen GET atar)
  if (req.method === "GET") {
    const auth = validateBasicAuth(req);
    if (!auth.ok) {
      return res.status(401).json({ success: false, message: auth.message });
    }
    return res.status(200).json({
      success: true,
      message: "Hepsiburada orders webhook endpoint",
      transactionTypes: SUPPORTED_TYPES,
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece GET ve POST desteklenir" });
  }

  const auth = validateBasicAuth(req);
  if (!auth.ok) {
    return res.status(401).json({ success: false, message: auth.message });
  }

  try {
    const event = req.body || {};
    const eventType =
      event.TransactionType ||
      event.eventType ||
      event.EventType ||
      event.type ||
      "";
    const orderNo =
      event.OrderNumber ??
      event.orderId ??
      event.orderNumber ??
      event.OrderId ??
      "";

    const userAgent = req.headers["user-agent"] || "";
    console.log(`📩 [HB Orders Webhook] ${eventType} | Order: ${orderNo || "—"} | User-Agent: ${userAgent}`);

    const { db } = await connectToDatabase();

    // Her isteği logla
    await db.collection("webhookEvents").insertOne({
      transactionType: eventType,
      orderNumber: orderNo,
      body: event,
      userAgent,
      receivedAt: new Date(),
    });

    if (!SUPPORTED_TYPES.includes(String(eventType))) {
      return res.status(200).json({
        success: true,
        message: `Event type '${eventType}' not handled (supported: ${SUPPORTED_TYPES.join(", ")})`,
      });
    }

    const col = db.collection("hb_orders");
    const now = new Date();

    // CancelOrderLine / OrderCancelled: satır veya sipariş iptali + ERP'de satış iptali
    if (ORDER_CANCEL_TYPES.includes(String(eventType))) {
      if (orderNo) {
        await col.updateOne(
          { $or: [{ orderNumber: String(orderNo) }, { "data.orderNumber": String(orderNo) }] },
          {
            $set: {
              "data.orderStatus": "Cancelled",
              "data.status": "Cancelled",
              cancelledAt: now,
              updatedAt: now,
              lastTransactionType: eventType,
            },
          },
          { upsert: false }
        );
        console.log("🚫 Sipariş/satır iptal güncellendi:", orderNo, eventType);
        // ERP'de bu sipariş satış olarak kayıtlıysa satış iptali (sale_cancel) oluştur
        const doc = await col.findOne({
          $or: [{ orderNumber: String(orderNo) }, { "data.orderNumber": String(orderNo) }],
        });
        if (doc?.erpSaleNo && doc?.companyId) {
          try {
            const cancelResult = await createSaleCancelBySaleNoAndCompany(doc.erpSaleNo, doc.companyId);
            if (cancelResult.ok) console.log("✅ ERP satış iptali:", doc.erpSaleNo, cancelResult.already ? "(zaten iptal)" : "");
          } catch (e) {
            console.warn("⚠️ ERP satış iptali oluşturulamadı:", e.message);
          }
          try {
            const revResult = await reversePazaryeriBorcBySaleNo(doc.erpSaleNo, doc.companyId, "Hepsiburada");
            if (revResult.ok) console.log("✅ Pazaryeri borcu geri alındı:", doc.erpSaleNo, revResult.already ? "(zaten)" : "");
          } catch (e) {
            console.warn("⚠️ Pazaryeri borç iptali:", e.message);
          }
        }
      }
      return res.status(200).json({ success: true });
    }

    if (eventType === "OrderUpdated") {
      const status = event.OrderStatus ?? event.status ?? event.OrderState;
      if (orderNo) {
        await col.updateOne(
          { $or: [{ orderNumber: String(orderNo) }, { "data.orderNumber": String(orderNo) }] },
          {
            $set: {
              "data.orderStatus": status ?? "Updated",
              "data.status": status ?? "Updated",
              "data.lastStatusUpdateDate": event.LastStatusUpdateDate ?? event.lastStatusUpdateDate ?? now,
              updatedAt: now,
              lastTransactionType: eventType,
            },
          },
          { upsert: false }
        );
        console.log("🔄 Sipariş güncellendi:", orderNo, status);
      }
      return res.status(200).json({ success: true });
    }

    // Teslimat webhook'ları: panelde doğru sekmeye (Kargoda / Teslim edildi / Teslim edilemedi) düşmesi için data.status da güncellenir
    if (DELIVERY_TYPES.includes(String(eventType))) {
      const deliveryStatus = DELIVERY_STATUS_MAP[eventType] || eventType;
      if (orderNo) {
        await col.updateOne(
          { $or: [{ orderNumber: String(orderNo) }, { "data.orderNumber": String(orderNo) }] },
          {
            $set: {
              "data.deliveryStatus": deliveryStatus,
              "data.status": deliveryStatus,
              "data.orderStatus": deliveryStatus,
              "data.lastDeliveryEvent": eventType,
              "data.lastDeliveryUpdate": event.LastStatusUpdateDate ?? event.lastStatusUpdateDate ?? now,
              updatedAt: now,
              lastTransactionType: eventType,
            },
          },
          { upsert: false }
        );
        console.log("📦 Teslimat güncellendi:", orderNo, deliveryStatus, eventType);
      }
      return res.status(200).json({ success: true });
    }

    // OrderCreate / OrderCreated / CreateOrderV2: body'de sipariş varsa kullan, yoksa OMS/STUB'dan çek
    if (!ORDER_CREATE_TYPES.includes(String(eventType))) {
      return res.status(200).json({ success: true });
    }

    let orderDetail = event.order ?? event.Order ?? event;

    if (!orderDetail?.orderNumber && orderNo) {
      const merchantId = getHepsiburadaMerchantId();
      const authHeader = getHepsiburadaAuth();
      const ua = getHepsiburadaUserAgent();

      if (merchantId && authHeader) {
        const omsBase = getHepsiburadaOmsBaseUrl();
        try {
          const omsUrl = `${omsBase}/orders/merchantid/${merchantId}?limit=50&offset=0`;
          const omsRes = await fetch(omsUrl, {
            headers: { Authorization: authHeader, "User-Agent": ua, Accept: "application/json" },
          });
          if (omsRes.ok) {
            const omsJson = await omsRes.json();
            orderDetail = omsJson?.orders?.find?.((o) => String(o.orderNumber) === String(orderNo)) ?? null;
            if (orderDetail) console.log("✅ OMS’ten sipariş alındı:", orderNo);
          }
        } catch (e) {
          console.warn("⚠️ OMS istek hatası:", e.message);
        }

        if (!orderDetail && isHepsiburadaTestMode()) {
          try {
            const stubUrl = `https://oms-stub-external-sit.hepsiburada.com/orders/merchantid/${merchantId}`;
            const stubRes = await fetch(stubUrl, {
              headers: { Authorization: authHeader, "User-Agent": ua, Accept: "application/json" },
            });
            if (stubRes.ok) {
              const stubJson = await stubRes.json();
              orderDetail = stubJson?.orders?.[0] ?? null;
              if (orderDetail) console.log("📦 STUB sipariş kullanıldı:", orderDetail?.orderNumber);
            }
          } catch (e) {
            console.warn("⚠️ STUB istek hatası:", e.message);
          }
        }
      } else {
        console.warn("⚠️ HEPSIBURADA_MERCHANT_ID + HEPSIBURADA_AUTH (veya HB_*) tanımlı değil; OMS/STUB çağrılmıyor.");
      }
    }

    const orderNumber = orderDetail?.orderNumber ?? orderNo;
    if (orderNumber) {
      await col.updateOne(
        { $or: [{ orderNumber: String(orderNumber) }, { "data.orderNumber": String(orderNumber) }] },
        {
          $set: {
            orderNumber: String(orderNumber),
            data: orderDetail || { orderNumber: String(orderNumber), status: "OrderCreated" },
            fetchedAt: now,
            updatedAt: now,
            lastTransactionType: eventType,
          },
        },
        { upsert: true }
      );
      console.log("💾 Sipariş kaydedildi:", orderNumber);

      // Yeni sipariş bildirimi: onaylı kullanıcılara mail (arka planda, webhook yanıtını geciktirmemek için)
      try {
        const users = await db.collection("users").find(
          { approved: true, email: { $exists: true, $ne: "" } },
          { projection: { email: 1 } }
        ).toArray();
        const emails = [...new Set(users.map((u) => u.email).filter(Boolean))];
        emails.forEach((email) => {
          sendNewOrderEmail(email, String(orderNumber), "Hepsiburada").catch((e) =>
            console.warn("Yeni sipariş maili gönderilemedi:", email, e?.message)
          );
        });
      } catch (e) {
        console.warn("Yeni sipariş bildirim mailleri atlanamadı:", e?.message);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("🔥 [HB Orders Webhook] Hata:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: "2mb" } },
};
