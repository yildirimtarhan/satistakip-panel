// /pages/api/trendyol/shipment/index.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST isteği kabul edilir." });

  try {
    const { orderNumber, cargoTrackingNumber, cargoCompanyId, items } = req.body;
    const { getTrendyolCredentials } = await import("@/lib/getTrendyolCredentials");
    const { shipmentPackagesUrl } = await import("@/lib/marketplaces/trendyolConfig");
    const creds = await getTrendyolCredentials(req);
    if (!creds) {
      return res.status(400).json({ message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol." });
    }
    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
    const url = shipmentPackagesUrl(creds.supplierId);

    const body = {
      orderNumber,
      shipmentAddressId: 1,
      lines: items,
      cargoTrackingNumber,
      cargoCompanyId,
    };

    const userAgent = process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": userAgent,
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
