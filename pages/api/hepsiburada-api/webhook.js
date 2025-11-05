// pages/api/hepsiburada-api/webhook.js
import clientPromise from "@/lib/mongodb";

/**
 * Hepsiburada Webhook (SIT)
 * - Optional Basic Auth (HB_WEBHOOK_USERNAME / HB_WEBHOOK_PASSWORD ayarlıysa zorunlu)
 * - Event'i webhookEvents koleksiyonuna loglar
 * - CreateOrderV2 / OrderCreated geldiğinde OMS -> STUB fallback ile siparişi çekip "orders" koleksiyonuna upsert eder
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  // ✅ Optional Basic Auth (env varsa kontrol et)
  try {
    const u = process.env.HB_WEBHOOK_USERNAME;
    const p = process.env.HB_WEBHOOK_PASSWORD;
    if (u && p) {
      const authHeader = req.headers.authorization || "";
      const expected =
        "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
      if (authHeader !== expected) {
        console.warn("🚨 Geçersiz webhook Basic Auth");
        return res.status(401).json({ message: "Unauthorized" });
      }
    }
  } catch (e) {
    console.error("BasicAuth kontrol hatası:", e);
    return res.status(500).json({ message: "Auth kontrol hatası" });
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
      event.OrderNumber ||
      event.orderId ||
      event.orderNumber ||
      "";

    console.log(`📩 [HB Webhook] Event: ${eventType} | Order: ${orderNo || "—"}`);

    // 🔎 DB bağlan
    const client = await clientPromise;
    const db = client.db("satistakip");

    // 📝 Event’i her durumda logla
    await db.collection("webhookEvents").insertOne({
      headers: req.headers,
      body: event,
      receivedAt: new Date(),
    });

    // ⛳ Sipariş oluşturma türleri geldiyse OMS -> STUB ile detayı çek
    const isCreateEvent = [
      "OrderCreated",
      "CreateOrderV2",
      "CreateOrder",
    ].includes(String(eventType));

    if (isCreateEvent && orderNo) {
      const merchantId = process.env.HB_MERCHANT_ID;
      const secret = process.env.HB_SECRET_KEY;
      const ua = process.env.HB_USER_AGENT || "satistakip_panel";
      const auth = "Basic " + Buffer.from(`${merchantId}:${secret}`).toString("base64");

      let orderDetail = null;

      // 1) OMS listeden dene
      try {
        const omsUrl = `https://oms-external-sit.hepsiburada.com/orders/merchantid/${merchantId}?limit=50&offset=0`;
        const omsRes = await fetch(omsUrl, {
          headers: { Authorization: auth, "User-Agent": ua, Accept: "application/json" },
        });
        if (omsRes.ok) {
          const omsJson = await omsRes.json();
          orderDetail = omsJson?.orders?.find?.((o) => String(o.orderNumber) === String(orderNo)) || null;
          if (orderDetail) console.log("✅ OMS içinde sipariş bulundu:", orderNo);
        } else {
          console.warn("⚠️ OMS response:", omsRes.status, await omsRes.text());
        }
      } catch (e) {
        console.warn("⚠️ OMS istek hatası:", e.message);
      }

      // 2) Bulunamazsa STUB fallback (dummy dönüyor ama SIT’te işe yarıyor)
      if (!orderDetail) {
        try {
          const stubUrl = `https://oms-stub-external-sit.hepsiburada.com/orders/merchantid/${merchantId}`;
          const stubRes = await fetch(stubUrl, {
            headers: { Authorization: auth, "User-Agent": ua, Accept: "application/json" },
          });
          if (stubRes.ok) {
            const stubJson = await stubRes.json();
            orderDetail = stubJson?.orders?.[0] || null;
            if (orderDetail) console.log("📦 STUB sipariş döndü (dummy):", orderDetail?.orderNumber);
          } else {
            console.warn("⚠️ STUB response:", stubRes.status, await stubRes.text());
          }
        } catch (e) {
          console.warn("⚠️ STUB istek hatası:", e.message);
        }
      }

      // 3) Kayıt
      if (orderDetail) {
        await db.collection("orders").updateOne(
          { orderNumber: String(orderNo) },
          {
            $set: {
              orderNumber: String(orderNo),
              platform: "hepsiburada",
              data: orderDetail,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
        console.log("💾 Sipariş DB’ye yazıldı:", orderNo);
      } else {
        console.warn("❓ Sipariş detayı bulunamadı (OMS+STUB). Order:", orderNo);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("🔥 Webhook işleme hatası:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Next.js bodyParser (HB bazı payload’larda iri olabilir)
export const config = {
  api: { bodyParser: { sizeLimit: "2mb" } },
};
