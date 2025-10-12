// pages/api/hepsiburada-api/[id].js

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const endpoint = process.env.HEPSIBURADA_ORDERS_ENDPOINT;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!endpoint || !merchantId || !secretKey || !userAgent) {
    return res.status(500).json({ message: "Hepsiburada API bilgileri eksik" });
  }

  try {
    // 🔥 Hepsiburada Tekil Sipariş Detay Endpoint
    const url = `${endpoint}/order/merchant-orders/${id}`;

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
      console.error("Hepsiburada Tekil Sipariş API Hatası:", response.status, errorText);
      return res.status(response.status).json({
        message: "Hepsiburada tekil sipariş API hatası",
        status: response.status,
        error: errorText || "Boş yanıt",
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Sunucu Hatası [id].js:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
