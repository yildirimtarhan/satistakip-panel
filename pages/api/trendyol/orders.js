export default async function handler(req, res) {
  try {
    const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
    const apiKey = process.env.TRENDYOL_API_KEY;
    const apiSecret = process.env.TRENDYOL_API_SECRET;
    const baseUrl = process.env.TRENDYOL_API_BASE;

    if (!supplierId || !apiKey || !apiSecret || !baseUrl) {
      return res.status(500).json({ message: "Trendyol API environment değişkenleri eksik." });
    }

    const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const url = `${baseUrl}/stagesapigw/suppliers/${supplierId}/orders?startDate=1597759208000`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${token}`,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return res.status(response.status).json(data);
    } catch (parseError) {
      console.error("Trendyol JSON parse hatası:", text);
      return res.status(500).json({ message: "Trendyol JSON parse hatası", rawResponse: text });
    }
  } catch (error) {
    console.error("Trendyol API hata:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
