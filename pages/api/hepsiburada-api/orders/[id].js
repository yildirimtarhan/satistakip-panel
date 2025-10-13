// pages/api/hepsiburada-api/orders/[id].js

export default async function handler(req, res) {
  const { id } = req.query;

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

  try {
    // 🔸 Tekil sipariş için endpoint —> orders/merchantid/{merchantId}/{id}
    const url = `${baseUrl}/orders/merchantid/${merchantId}/${id}`;
    console.log("📡 Tekil sipariş URL:", url);

    const authHeader =
      "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      console.error("❌ Hepsiburada Tekil Sipariş Hatası:", response.status, data);
      return res
        .status(response.status)
        .json({ message: "Tekil sipariş çekilemedi", status: response.status, error: data });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("🔥 Sunucu Hatası /orders/[id]:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
