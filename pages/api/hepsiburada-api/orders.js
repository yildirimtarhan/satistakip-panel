// ✅ Hepsiburada Canlı Ortam Sipariş API — Dinamik Parametreli, Güçlendirilmiş

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    startDate = "2025-10-01T00:00:00",
    endDate = "2025-10-10T23:59:59",
    page = 0,
    size = 10
  } = req.query;

  const endpoint = process.env.HEPSIBURADA_ORDERS_ENDPOINT;
  const username = process.env.HEPSIBURADA_USERNAME;
  const password = process.env.HEPSIBURADA_PASSWORD;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT || "Tigdes";

  if (!endpoint || !username || !password) {
    return res.status(500).json({ message: "Ortam değişkenleri eksik" });
  }

  const authHeader =
    "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  const url = `${endpoint}/orders?startDate=${startDate}&endDate=${endDate}&page=${page}&size=${size}`;

  try {
    console.log("🔸 İstek URL:", url);
    console.log("🔸 Authorization Header:", authHeader);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "User-Agent": userAgent,
        Accept: "application/json"
      }
    });

    const text = await response.text();
    console.log("🔸 Ham API Yanıtı:", text);

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Hepsiburada API isteği başarısız",
        status: response.status,
        raw: text
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        message: "Hepsiburada yanıtı JSON formatında değil",
        raw: text
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ Sunucu Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
