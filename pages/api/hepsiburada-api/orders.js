export default async function handler(req, res) {
  try {
    const {
      HEPSIBURADA_MERCHANT_ID,
      HEPSIBURADA_PASSWORD,
      HEPSIBURADA_USER_AGENT,
      HEPSIBURADA_ORDERS_ENDPOINT
    } = process.env;

    // 🧠 Basic Auth bilgisi
    const auth = Buffer.from(`${HEPSIBURADA_MERCHANT_ID}:${HEPSIBURADA_PASSWORD}`).toString("base64");

    const url = `${HEPSIBURADA_ORDERS_ENDPOINT}/orders`;
    const headers = {
      Authorization: `Basic ${auth}`,
      "User-Agent": HEPSIBURADA_USER_AGENT,
      "Content-Type": "application/json",
    };

    // 📝 Logla
    console.log("🔹 Hepsiburada API istek URL:", url);
    console.log("🔹 Authorization Header:", headers.Authorization);
    console.log("🔹 User-Agent:", headers["User-Agent"]);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Hepsiburada API Hatası:", response.status, text);
      return res.status(response.status).json({
        message: "Hepsiburada API hatası",
        status: response.status,
        error: text || "Hepsiburada API boş yanıt döndürdü",
      });
    }

    const data = await response.json();
    console.log("✅ Hepsiburada API yanıtı:", data);
    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ Sunucu Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
