export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  const { orderNumber, cargoCompany, shippingAddress, lines } = req.body;

  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  try {
    const url = `${baseUrl}/packages/create`;

    const payload = {
      orderNumber,
      cargoCompany: cargoCompany || "Yurtiçi Kargo",
      shippingAddress: shippingAddress || {
        city: "İstanbul",
        district: "Kadıköy",
        address: "TEST ADRES",
      },
      lines: lines || [],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": userAgent,
        "Authorization": "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) {
      return res.status(response.status).json({ message: "Paket oluşturma hatası", error: data });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Paket API hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
