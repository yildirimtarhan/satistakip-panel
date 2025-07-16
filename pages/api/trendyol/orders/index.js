export default async function handler(req, res) {
  const supplierId = 2738;
  const apiKey = "CBhBwH9iuCyWDJOlX3hE";
  const apiSecret = "B1B0cvdasOz6Ai7eqIB7";

  const startDate = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const endDate = Date.now();

  const url = `https://stageapi.trendyol.com/stagesapigw/suppliers/${supplierId}/orders?startDate=${startDate}&endDate=${endDate}&page=0&size=50`;

  const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        Referer: "https://stagepartner.trendyol.com/",
        Origin: "https://stagepartner.trendyol.com"
      }
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      console.error("💥 HTML döndü (Cloudflare):", html.slice(0, 300));
      return res.status(403).json({ error: "Erişim engellendi (Cloudflare)" });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("⛔ Hata:", error);
    return res.status(500).json({ error: "Sunucu hatası veya ağ problemi" });
  }
}
