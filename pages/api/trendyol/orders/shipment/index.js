// /pages/api/trendyol/shipment/index.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST isteği kabul edilir." });

  try {
    const { orderNumber, cargoTrackingNumber, cargoCompanyId, items } = req.body;
    const { TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY, TRENDYOL_API_SECRET, TRENDYOL_API_BASE } = process.env;
    const auth = Buffer.from(`${TRENDYOL_API_KEY}:${TRENDYOL_API_SECRET}`).toString("base64");

    const url = `${TRENDYOL_API_BASE}/suppliers/${TRENDYOL_SUPPLIER_ID}/shipment-packages`;

    const body = {
      orderNumber,
      shipmentAddressId: 1,
      lines: items,
      cargoTrackingNumber,
      cargoCompanyId,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": "tigdes_dev",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok)
      return res.status(response.status).json({ message: "Kargo bildirimi başarısız", raw: data });

    return res.status(200).json({ message: "✅ Kargo bildirimi başarıyla gönderildi", data });
  } catch (err) {
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
