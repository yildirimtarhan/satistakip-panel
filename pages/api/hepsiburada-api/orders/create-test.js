// pages/api/hepsiburada-api/orders/create-test.js
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Only POST allowed" });

  try {
    const now = new Date().toISOString();
    const randomOrderNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString(); // ✅ sadece rakam

    const orderPayload = {
      OrderNumber: randomOrderNumber, // ✅ artık rakam
      OrderDate: now,
      Customer: {
        CustomerId: "TEST-" + Date.now(),
        Name: "Test User"
      },
      DeliveryAddress: {
        AddressId: "ADDR-" + Date.now(),
        Name: "Test Address",
        AddressDetail: "Mecidiyeköy",
        Email: "test@hepsiburada.com",
        CountryCode: "TR",
        PhoneNumber: "905555555555",
        AlternatePhoneNumber: "905555555556",
        Town: "Şişli",
        District: "Şişli",
        City: "İstanbul"
      },
      LineItems: [
        {
          Sku: "HBV00001065YF",
          MerchantId: process.env.HB_MERCHANT_ID,
          Quantity: 1,
          Price: { Amount: 100, Currency: "TRY" },
          Vat: 0,
          TotalPrice: { Amount: 100, Currency: "TRY" },
          CargoCompanyId: 89100,
          DeliveryOptionId: 1,
          TagList: ["dijital-urunler"]
        }
      ]
    };

    const authString = Buffer.from(
      `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
    ).toString("base64");

    const url = `https://oms-stub-external-sit.hepsiburada.com/orders/merchantid/${process.env.HB_MERCHANT_ID}`;

    const hbRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "User-Agent": process.env.HB_USER_AGENT,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload)
    });

    const text = await hbRes.text();

    return res.status(200).json({
      success: true,
      sent: orderPayload,
      response: text
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
