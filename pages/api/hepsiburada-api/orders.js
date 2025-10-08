export default async function handler(req, res) {
  const url = `${process.env.HEPSIBURADA_ORDERS_ENDPOINT}/orders`;
  const username = process.env.HEPSIBURADA_USERNAME;
  const password = process.env.HEPSIBURADA_PASSWORD;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  try {
    console.log("🔹 Hepsiburada API URL:", url);
    console.log("🔹 Authorization Header:", authHeader);
    console.log("🔹 User-Agent:", userAgent);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.error("❌ Hepsiburada API Hatası:", response.status);
      return res.status(response.status).json({
        message: "Hepsiburada API hatası",
        status: response.status,
        error: await response.text()
      });
    }

    const data = await response.json();
    console.log("✅ Hepsiburada API yanıtı:", data);
    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ Sunucu Hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message
    });
  }
}
