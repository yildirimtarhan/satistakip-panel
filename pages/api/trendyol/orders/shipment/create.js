// ✅ pages/api/trendyol/shipment/create.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Yalnızca POST isteği desteklenir.' });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, message: 'orderId eksik.' });
  }

  const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;

  const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const baseUrl = 'https://stageapi.trendyol.com/stagesapigw';

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
    const response = await fetch(
      `${baseUrl}/suppliers/${supplierId}/shipment-packages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shipmentData)
      }
    );

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
