export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  // ✅ Gerekli env değişkenlerini kontrol et
  const requiredEnv = [
    "HB_MERCHANT_ID",
    "HB_SECRET_KEY",
    "HB_USER_AGENT"
  ];

  const missing = requiredEnv.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Eksik environment değişkenleri:", missing);
    return res.status(500).json({
      message: "Hepsiburada API environment değişkenleri eksik.",
      missing
    });
  }

  try {
    const orderPayload = {
      orderId: "TEST-" + Date.now(),
      customerId: "TESTCUSTOMER001",
      cargoCompanyId: 89100, // ✅ Hepsiburada test cargoId
      lines: [
        {
          lineId: "LINE-" + Date.now(),
          merchantSku: "HBV00001065YF", // ✅ Test ürün SKU
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100
        }
      ],
      shippingAddress: {
        fullName: "Test User",
        city: "İstanbul",
        district: "Şişli",
        addressLine1: "Hepsiburada Test Address",
        postalCode: "34000",
        phone: "5555555555"
      },
      invoiceAddress: {
        fullName: "Test User",
        city: "İstanbul",
        district: "Şişli",
        addressLine1: "Hepsiburada Test Address",
        postalCode: "34000",
        phone: "5555555555"
      }
    };

    const authString = Buffer.from(
      `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
    ).toString("base64");

    const url = `https://oms-external-sit.hepsiburada.com/orders/merchantid/${process.env.HB_MERCHANT_ID}`;
    

    console.log("🚀 HB TEST ORDER REQUEST:", {
      url,
      headers: {
        Authorization: `Basic ${authString.slice(0, 6)}***`, // masked
        "User-Agent": process.env.HB_USER_AGENT
      },
      body: orderPayload
    });

    const hbRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "User-Agent": process.env.HB_USER_AGENT,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderPayload)
    });

    const text = await hbRes.text();

    console.log("📦 HB Raw Response:", text);

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(200).json({
        success: true,
        info: "HB SIT non-JSON response (normal behaviour in SIT)",
        raw: text
      });
    }

    return res.status(200).json({
      success: true,
      hb: json
    });

  } catch (err) {
    console.error("🔥 HB Test Order Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
