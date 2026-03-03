import { ordersListUrl } from "@/lib/marketplaces/trendyolConfig";
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";

export default async function handler(req, res) {
  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({ message: "Trendyol API bilgileri eksik. API Ayarları → Trendyol." });
  }
  const { supplierId, apiKey, apiSecret } = creds;
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const response = await fetch(
      `${ordersListUrl(supplierId)}?status=Created`,
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
