import axios from "axios";

export default async function handler(req, res) {
  try {
    const {
      HEPSIBURADA_MERCHANT_ID,
      HEPSIBURADA_PASSWORD,
      HEPSIBURADA_USER_AGENT,
      HEPSIBURADA_ORDERS_ENDPOINT,
    } = process.env;

    if (!HEPSIBURADA_MERCHANT_ID || !HEPSIBURADA_PASSWORD) {
      return res.status(500).json({ message: "Eksik Hepsiburada API bilgisi" });
    }

    // Basic Auth için merchantId:password birleşimi
    const auth = Buffer.from(
      `${HEPSIBURADA_MERCHANT_ID}:${HEPSIBURADA_PASSWORD}`
    ).toString("base64");

    // Örnek: son 1 günün siparişlerini çekelim
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);

    const url = `${HEPSIBURADA_ORDERS_ENDPOINT}/orders?status=Created&startDate=${startDate.toISOString()}`;

    console.log("➡️ Hepsiburada API isteği:", url);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": HEPSIBURADA_USER_AGENT,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Hepsiburada API cevabı:", response.data);

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("❌ Hepsiburada API hatası:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Hepsiburada API hatası",
      error: error.response?.data || error.message,
    });
  }
}
