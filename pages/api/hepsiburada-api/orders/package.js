export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  const { orderNumber, cargoCompany } = req.body;

  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  try {
    const response = await fetch(`${baseUrl}/packages/create`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderNumber,
        cargoCompany: cargoCompany || "Yurtiçi Kargo",
      }),
    });

    const text = await response.text();
    const data = (() => { try { return JSON.parse(text) } catch { return text } })();

    if (!response.ok) {
      return res.status(response.status).json({ message: "Hepsiburada paket oluşturma başarısız", error: data });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Paket oluşturma hatası:", error);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
