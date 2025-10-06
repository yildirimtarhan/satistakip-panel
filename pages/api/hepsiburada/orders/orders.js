// pages/api/hepsiburada-api/orders.js

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const endpoint = process.env.HEPSIBURADA_ORDERS_ENDPOINT;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!endpoint || !merchantId || !secretKey || !userAgent) {
    return res.status(500).json({ message: "Sunucu yapılandırma hatası (env eksik)" });
  }

  try {
    const url = `${endpoint}/order/merchant-orders?status=New`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

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
    console.error("Sunucu Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
