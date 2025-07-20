// pages/api/hepsiburada/orders/index.js

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const url = "https://mp-test.hepsiburada.com/order/merchant-orders?status=New";

  const username = "07283889-aa00-4809-9d19-b76d97f9bebd"; // Merchant ID
  const password = "ttFE8CrzpC8a"; // Secret Key
  const userAgent = "tigdes_dev"; // Developer Username

  const headers = {
    Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
    "User-Agent": userAgent,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const text = await response.text(); // hata html olabilir
      console.error("Hepsiburada API hatası:", text);
      return res.status(response.status).json({ message: "API hatası", detay: text });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Bağlantı hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
