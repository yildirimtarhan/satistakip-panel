// pages/api/hepsiburada-api/orders.js

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const username = process.env.HEPSIBURADA_USERNAME;
  const password = process.env.HEPSIBURADA_PASSWORD;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;
  const endpoint = process.env.HEPSIBURADA_ORDERS_ENDPOINT;

  if (!username || !password || !secretKey || !userAgent || !endpoint) {
    return res.status(500).json({ message: "Hepsiburada API bilgileri eksik (env)" });
  }

  try {
    const url = `${endpoint}/orders`;

    console.log("🔹 Hepsiburada URL:", url);
    console.log("🔹 Username:", username);
    console.log("🔹 User-Agent:", userAgent);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Hepsiburada API Hatası:", response.status, errorText);
      return res.status(response.status).json({
        message: "Hepsiburada API hatası",
        status: response.status,
        error: errorText || "Hepsiburada API boş yanıt döndürdü",
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Sunucu Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
