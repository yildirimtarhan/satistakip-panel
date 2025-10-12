export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  try {
    const url = `${baseUrl}/order/merchant-orders/${id}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        "Authorization": "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
      },
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) {
      return res.status(response.status).json({ message: "Tekil sipariş getirilemedi", error: data });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Tekil sipariş API hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
