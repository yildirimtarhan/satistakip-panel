// pages/api/hepsiburada-api/orders.js

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const url = `${process.env.HEPSIBURADA_ORDERS_ENDPOINT}/order/merchant-orders?status=New`;

  const username = process.env.HEPSIBURADA_MERCHANT_ID;
  const password = process.env.HEPSIBURADA_SECRET_KEY; // canlı ortam için secret key
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  const headers = {
    Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
    "User-Agent": userAgent,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text();
      console.error("Hepsiburada API hatası:", text);
      return res.status(response.status).json({ message: "Hepsiburada API hatası", error: text });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Bağlantı hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
