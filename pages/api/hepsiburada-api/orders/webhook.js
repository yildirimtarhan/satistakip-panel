import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  // ✅ Basic Auth kontrolü
  const authHeader = req.headers.authorization;
  const expectedAuth =
    "Basic " +
    Buffer.from(
      `${process.env.HB_WEBHOOK_USERNAME}:${process.env.HB_WEBHOOK_PASSWORD}`
    ).toString("base64");

  if (authHeader !== expectedAuth) {
    console.warn("🚨 Geçersiz webhook erişimi");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const event = req.body;
    const eventType = event.TransactionType || event.eventType;
    const orderNo = event.OrderNumber || event.orderId;

    console.log(`📩 [HB Webhook] Event: ${eventType} | Order: ${orderNo}`);

    const client = await clientPromise;
    const db = client.db("satistakip");

    // ✅ Webhook event logla
    await db.collection("webhookEvents").insertOne({
      OrderNumber: orderNo,
      TransactionType: eventType,
      receivedAt: new Date(),
    });

    // ✅ Sadece sipariş oluşturulduysa işlem yap
    if (eventType === "OrderCreated" && orderNo) {
      console.log(`🔄 Sipariş detayı çekiliyor: ${orderNo}`);

      const authString = Buffer.from(
        `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
      ).toString("base64");

      let orderDetail = null;

      // ✅ OMS endpoint - liste çek ve filtrele
      const omsUrl = `https://oms-external-sit.hepsiburada.com/orders/merchantid/${process.env.HB_MERCHANT_ID}?limit=50&offset=0`;
      console.log("🌐 OMS URL:", omsUrl);

      const omsRes = await fetch(omsUrl, {
        headers: {
          Authorization: `Basic ${authString}`,
          "User-Agent": process.env.HB_USER_AGENT,
          Accept: "application/json",
        },
      });

      if (omsRes.ok) {
        const omsJson = await omsRes.json();
        orderDetail = omsJson.orders?.find(o => o.orderNumber == orderNo);

        if (orderDetail) {
          console.log(`✅ OMS sipariş bulundu: ${orderNo}`);
        } else {
          console.warn("⚠️ OMS içinde sipariş bulunamadı, STUB deneniyor...");
        }
      } else {
        const err = await omsRes.text();
        console.warn(`⚠️ OMS başarısız (${omsRes.status}), STUB deneniyor...`, err);
      }

      // ✅ Eğer OMS bulamazsa → STUB fallback
      if (!orderDetail) {
        const stubUrl = `https://oms-stub-external-sit.hepsiburada.com/orders/merchantid/${process.env.HB_MERCHANT_ID}`;
        console.log("🌐 STUB URL:", stubUrl);

        const stubRes = await fetch(stubUrl, {
          headers: {
            Authorization: `Basic ${authString}`,
            "User-Agent": process.env.HB_USER_AGENT,
            Accept: "application/json",
          },
        });

        if (stubRes.ok) {
          const stubJson = await stubRes.json();
          orderDetail = stubJson.orders?.[0] ?? null;
          console.log("📦 STUB sipariş döndü (dummy kullanıldı)");
        } else {
          const err = await stubRes.text();
          console.error("❌ STUB da hata:", err);
        }
      }

      // ✅ Hiç veri yoksa
      if (!orderDetail) {
        console.error("❌ Sipariş alınamadı, hem OMS hem STUB hata verdi");
        return res.status(500).json({ success: false });
      }

      // ✅ Veriyi DB'ye kaydet
      await db.collection("orders").updateOne(
        { orderNumber: orderNo },
        {
          $set: {
            orderNumber: orderNo,
            platform: "hepsiburada",
            data: orderDetail,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      console.log(`✅ Sipariş kaydedildi: ${orderNo}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("🔥 Webhook işleme hatası:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
