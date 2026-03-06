// ✅ pages/api/trendyol/shipment/create.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Yalnızca POST isteği desteklenir.' });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, message: 'orderId eksik.' });
  }

  const { getTrendyolCredentials } = await import("@/lib/getTrendyolCredentials");
  const { shipmentPackagesUrl } = await import("@/lib/marketplaces/trendyolConfig");
  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol." });
  }
  const authHeader = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const url = shipmentPackagesUrl(creds.supplierId);

  const shipmentData = {
    lines: [
      {
        orderLineId: orderId, // Test amaçlı doğrudan orderId yazdık
        quantity: 1,
      }
    ],
    cargoTrackingNumber: 'TR1234567890',
    cargoCompanyId: 1, // Hepsijet örneğin: 10, Yurtiçi: 1, Trendyol Express: 2003
  };

  try {
    const userAgent = process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0";
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'User-Agent': userAgent,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shipmentData)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(500).json({ success: false, message: 'Trendyol kargo API hatası', detail: result });
    }

    return res.status(200).json({ success: true, message: 'Kargo gönderildi', result });
  } catch (error) {
    console.error('Sunucu hatası:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: error.message });
  }
}
