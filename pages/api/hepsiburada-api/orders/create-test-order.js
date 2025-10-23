// pages/api/hepsiburada-api/orders/create-test-order.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sadece POST istekleri desteklenmektedir." });
  }

  try {
    const { HB_MERCHANT_ID, HB_SECRET_KEY, HB_USER_AGENT } = process.env;

    if (!HB_MERCHANT_ID || !HB_SECRET_KEY) {
      return res.status(400).json({ error: "Merchant ID veya Secret Key bulunamadı (.env kontrol et)" });
    }

    const authString = Buffer.from(`${HB_MERCHANT_ID}:${HB_SECRET_KEY}`).toString("base64");

    const url = `https://oms-stub-external-sit.hepsiburada.com/orders/merchantId/${HB_MERCHANT_ID}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "User-Agent": HB_USER_AGENT || "tigdes_dev",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("🚨 Test siparişi oluşturulamadı:", data);
      return res.status(response.status).json(data);
    }

    console.log("✅ Test siparişi başarıyla oluşturuldu:", data);
    return res.status(200).json(data);
  } catch (error) {
    console.error("🔥 API route hatası:", error);
    return res.status(500).json({ error: error.message });
  }
}
