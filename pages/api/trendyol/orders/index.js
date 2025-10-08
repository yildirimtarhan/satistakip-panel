// pages/api/trendyol/orders.js

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;
  const baseUrl = process.env.TRENDYOL_API_BASE; // stage URL

  if (!supplierId || !apiKey || !apiSecret || !baseUrl) {
    return res.status(500).json({ message: "Trendyol API bilgileri eksik (env)" });
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // son 30 gün
    const startTimestamp = startDate.getTime();

    const url = `${baseUrl}/suppliers/${supplierId}/orders?startDate=${startTimestamp}`;

    console.log("📡 Trendyol API URL:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64"),
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Trendyol API Hatası:", response.status, errorText);
      return res.status(response.status).json({
        message: "Trendyol API hatası",
        status: response.status,
        error: errorText || "Trendyol API boş yanıt döndürdü",
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("🚨 Sunucu Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
