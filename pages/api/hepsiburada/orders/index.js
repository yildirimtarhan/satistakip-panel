export default async function handler(req, res) {
  const merchantId = '07283889-aa00-4809-9d19-b76d97f9bebd';
  const secretKey = 'ttFE8CrzpC8a';
  const userAgent = 'tigdes_dev';

  const url = 'https://api-sit.hepsiburada.com/orders/merchant-order-list';

  const auth = Buffer.from(`${merchantId}:${secretKey}`).toString('base64');
  console.log("🔥 AUTH HEADER:", auth);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': userAgent,
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    console.log("🔥 API Yanıtı:", text);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: "Veri alınamadı",
        detail: text,
      });
    }

    const data = JSON.parse(text);
    return res.status(200).json({ success: true, orders: data });

  } catch (error) {
    console.error("🔥 Sunucu Hatası:", error);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
