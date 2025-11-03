import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  // ✅ Webhook Basic Auth
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
    const eventType = event.TransactionType;
    const orderNo = event.OrderNumber;

    console.log(`📩 [HB Webhook] Event: ${eventType} | Order: ${orderNo}`);

    const client = await clientPromise;
    const db = client.db("satistakip");

    // ✅ Log event
    await db.collection("webhookEvents").insertOne({
      event,
      orderNo,
      eventType,
      receivedAt: new Date(),
    });

    // ✅ OrderCreated → OMS'den sipariş çek
    if (eventType === "OrderCreated" && orderNo) {
      console.log(`🔄 Sipariş detayı çekiliyor: ${orderNo}`);

      const authString = Buffer.from(
        `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`,
        "utf8"
      ).toString("base64");

      const omsUrl = `https://oms-external-sit.hepsiburada.com/orders/merchantid/${process.env.HB_MERCHANT_ID}?orderNumber=${orderNo}`;
      console.log("🌐 OMS URL:", omsUrl);

      const omsResponse = await fetch(omsUrl, {
        headers: {
          Authorization: `Basic ${authString}`,
          "User-Agent": process.env.HB_USER_AGENT || "tigdes_dev",
          Accept: "application/json",
          ChannelType: "OMS",
          AuthenticationType: "INTEGRATOR",
        },
      });

      let orderDetail = null;

      // ✅ OMS başarısız → STUB'a geç
      if (!omsResponse.ok) {
        const err = await omsResponse.text();
        console.warn(`⚠️ OMS başarısız (${omsResponse.status}), STUB deneniyor...`, err);

        const stubUrl = `https://oms-stub-external-sit.hepsiburada.com/orders/merchantid/${process.env.HB_MERCHANT_ID}?orderNumber=${orderNo}`;
        console.log("🌐 STUB URL:", stubUrl);

        const stubResponse = await fetch(stubUrl, {
          headers: {
            Authorization: `Basic ${authString}`,
            "User-Agent": process.env.HB_USER_AGENT || "tigdes_dev",
            Accept: "application/json",
          },
        });

        if (!stubResponse.ok) {
          const stubErr = await stubResponse.text();
          console.error(`❌ STUB da hata verdi: ${stubResponse.status}`, stubErr);
          return res.status(500).json({ success: false, message: "OMS + STUB fetch failed" });
        }

        try {
          const stubRaw = await stubResponse.text();
          orderDetail = stubRaw ? JSON.parse(stubRaw) : null;
          console.log("✅ STUB sipariş verisi alındı");
        } catch {
          orderDetail = null;
        }
      } else {
        try {
          const raw = await omsResponse.text();
          orderDetail = raw ? JSON.parse(raw) : null;
          console.log("✅ OMS sipariş verisi alındı");
        } catch {
          orderDetail = null;
        }
      }

      if (!orderDetail) {
        console.warn(`⚠️ OMS & STUB boş döndü: ${orderNo}`);
        return res.status(200).json({ success: true, note: "HB empty response" });
      }

      // ✅ Siparişi DB'ye kaydet
      await db.collection("orders").updateOne(
        { orderNumber: orderNo },
        {
          $set: {
            orderNumber: orderNo,
            platform: "hepsiburada",
            data: orderDetail,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      console.log(`✅ Sipariş veritabanına kaydedildi: ${orderNo}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("🔥 Webhook işleme hatası:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
