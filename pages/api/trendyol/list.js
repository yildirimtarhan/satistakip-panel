export default async function handler(req, res) {
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID;

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const response = await fetch(
      `https://stageapi.trendyol.com/stagesapigw/suppliers/${supplierId}/orders?status=Created`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API yanıtı başarısız: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Sipariş listeleme hatası:", error);
    res.status(500).json({ message: "Siparişler alınamadı." });
  }
}
