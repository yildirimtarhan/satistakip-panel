export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const url = "https://mp-test.hepsiburada.com/order/merchant-orders?status=New";

  const username = process.env.HEPSIBURADA_MERCHANT_ID;
  const password = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  const headers = {
    Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
    "User-Agent": userAgent,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, { method: "GET", headers });

    // Eğer response'da hata varsa, text formatında al
    if (!response.ok) {
      const text = await response.text();
      console.error("Hepsiburada API Hatası:", text); // Hata mesajını konsola yazdır
      return res.status(response.status).json({ message: "API hatası", detay: text });
    }

    // Yanıtı JSON formatında al ve konsola yazdır
    const data = await response.json();
    console.log("API Yanıtı:", data);
    return res.status(200).json(data);

  } catch (error) {
    console.error("Bağlantı Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
