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
    const response = await fetch(`${baseUrl}/order/merchant-orders/${id}`, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ message: "Hepsiburada API hatası", error: errorText });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Tekil sipariş getirme hatası:", error);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
