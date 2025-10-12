export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!baseUrl || !merchantId || !secretKey || !userAgent) {
    return res.status(500).json({ message: "Hepsiburada API environment değişkenleri eksik." });
  }

  const { beginDate, endDate, offset = 0, limit = 100 } = req.query;

  const url = `${baseUrl}/orders/merchantid/${merchantId}?offset=${offset}&limit=${limit}&beginDate=${beginDate || "2025-10-01 00:00"}&endDate=${endDate || "2025-10-13 23:59"}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        "Authorization": "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
      },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Hepsiburada Sipariş Listesi Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
