// pages/api/hepsiburada-api/orders/index.js

export default async function handler(req, res) {
  const { beginDate, endDate, offset = 0, limit = 100 } = req.query;

  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const auth = process.env.HEPSIBURADA_AUTH;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!baseUrl || !merchantId || !auth || !userAgent) {
    return res.status(500).json({ message: "Hepsiburada API environment değişkenleri eksik." });
  }

  try {
    // 📡 Hepsiburada Sipariş Listesi Endpoint
    const url = `${baseUrl}/orders/merchantid/${merchantId}?offset=${offset}&limit=${limit}&beginDate=${beginDate}&endDate=${endDate}`;
    console.log("📡 HB Order List URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
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
      console.error("❌ Hepsiburada Order List API Hatası:", response.status, data);
      return res.status(response.status).json({
        message: "Sipariş listesi çekilemedi",
        status: response.status,
        error: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("🔥 Sunucu Hatası /orders:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
