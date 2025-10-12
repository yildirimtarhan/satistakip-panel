export default async function handler(req, res) {
  const { packageId } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  try {
    const response = await fetch(`${baseUrl}/packages/${packageId}`, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
        "User-Agent": userAgent,
      },
    });

    const text = await response.text();
    const data = (() => { try { return JSON.parse(text) } catch { return text } })();

    if (!response.ok) {
      return res.status(response.status).json({ message: "Paket detayı alınamadı", error: data });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Paket detay sorgusu hatası:", error);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
