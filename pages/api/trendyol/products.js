// pages/api/trendyol/products.js
export default async function handler(req, res) {
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const response = await fetch(
      `https://stageapi.trendyol.com/stagesapigw/suppliers/${supplierId}/products`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Trendyol API Hatası:", error);
    res.status(500).json({ message: "Veri alınamadı" });
  }
}
