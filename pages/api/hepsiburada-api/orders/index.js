// pages/api/hepsiburada-api/orders/index.js
export default async function handler(req, res) {
  try {
    const { offset = 0, limit = 100, beginDate, endDate } = req.query;

    if (!beginDate || !endDate) {
      return res.status(400).json({ error: "beginDate ve endDate zorunludur." });
    }

    const authString = Buffer.from(
      `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
    ).toString("base64");

    const apiUrl = `https://mpop-sit.hepsiburada.com/api/order-management-api/v1/orders?offset=${offset}&limit=${limit}&beginDate=${encodeURIComponent(beginDate)}&endDate=${encodeURIComponent(endDate)}`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${authString}`,
        "User-Agent": process.env.HB_USER_AGENT,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Hepsiburada API hata: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("🚨 Hepsiburada sipariş listesi alınamadı:", error);
    return res.status(500).json({ error: error.message });
  }
}
