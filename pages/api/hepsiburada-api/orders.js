// pages/api/hepsiburada-api/orders.js

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const baseUrl = process.env.HEPSIBURADA_ORDERS_ENDPOINT;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const password = process.env.HEPSIBURADA_PASSWORD;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!baseUrl || !merchantId || !password || !userAgent) {
    console.error("❌ Ortam değişkenlerinden biri eksik");
    return res.status(500).json({ message: "Sunucu yapılandırma hatası (env eksik)" });
  }

  const url = `${baseUrl}/order/merchant-orders?status=New`;

  const headers = {
    Authorization: "Basic " + Buffer.from(`${merchantId}:${password}`).toString("base64"),
    "User-Agent": userAgent,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hepsiburada API Hatası:", errorText);
      return res.status(response.status).json({
        message: "Hepsiburada API hatası",
        error: errorText,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Bağlantı hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
