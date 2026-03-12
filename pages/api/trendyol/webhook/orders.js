/**
 * Trendyol Sipariş Webhook
 * Trendyol bu URL'e POST atar; getShipmentPackages ile aynı formatta sipariş paketleri gelir.
 * Auth: x-api-key (API_KEY) veya Basic (BASIC_AUTHENTICATION)
 * .env: TRENDYOL_WEBHOOK_SECRET — webhook doğrulama (API_KEY veya Basic password)
 */
import { connectToDatabase } from "@/lib/mongodb";

const ALLOWED_STATUSES = [
  "CREATED", "PICKING", "INVOICED", "SHIPPED", "DELIVERED",
  "VERIFIED", "AT_COLLECTION_POINT", "UNPACKED", "AWAITING",
  "UNSUPPLIED", "RETURNED", "UNDELIVERED", "CANCELLED",
];

function getWebhookSecret() {
  return process.env.TRENDYOL_WEBHOOK_SECRET || process.env.TRENDYOL_API_KEY || "";
}

function validateRequest(req) {
  const secret = getWebhookSecret();
  if (!secret) return { ok: false, message: "TRENDYOL_WEBHOOK_SECRET veya TRENDYOL_API_KEY tanımlı değil" };

  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === secret) return { ok: true };

  const auth = req.headers.authorization || "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
      const [user, pass] = decoded.split(":");
      if (pass === secret || (user && pass)) return { ok: true };
    } catch (_) {}
  }
  return { ok: false, message: "Webhook doğrulama başarısız (x-api-key veya Basic Auth)" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Sadece POST desteklenir" });
  }

  const validation = validateRequest(req);
  if (!validation.ok) {
    return res.status(401).json({ success: false, message: validation.message });
  }

  try {
    const body = req.body || {};
    const content = body.content ?? body.Content ?? (Array.isArray(body) ? body : []);
    const packages = Array.isArray(content) ? content : [];

    if (packages.length === 0) {
      return res.status(200).json({ success: true, message: "Boş içerik, işlem yok" });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("ty_orders");
    const eventsCol = db.collection("webhookEvents");

    const now = new Date();
    let saved = 0;

    for (const pkg of packages) {
      const orderNumber = pkg.orderNumber ?? pkg.shipmentPackageId ?? pkg.id;
      if (!orderNumber) continue;

      const doc = {
        marketplace: "trendyol",
        orderNumber: String(orderNumber),
        data: pkg,
        receivedAt: now,
        updatedAt: now,
        source: "webhook",
      };

      await col.updateOne(
        { marketplace: "trendyol", orderNumber: String(orderNumber) },
        { $set: doc },
        { upsert: true }
      );
      saved++;
    }

    await eventsCol.insertOne({
      marketplace: "trendyol",
      type: "order",
      packageCount: packages.length,
      saved,
      receivedAt: now,
    });

    return res.status(200).json({
      success: true,
      message: `${saved} sipariş kaydedildi`,
      saved,
    });
  } catch (e) {
    console.error("Trendyol webhook error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
}
