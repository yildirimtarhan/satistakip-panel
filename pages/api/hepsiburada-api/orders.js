// pages/api/hepsiburada-api/orders.js

export default async function handler(req, res) {
  // 🟡 Token kontrolü şimdilik kapalı
  // (canlıya geçince tekrar açabiliriz)
  // const cookies = cookie.parse(req.headers.cookie || "");
  // const token = cookies.token;
  // if (!token) {
  //   return res.status(401).json({ message: "Yetkilendirme başarısız (token eksik)" });
  // }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const endpoint = process.env.HEPSIBURADA_ORDERS_ENDPOINT;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!endpoint || !merchantId || !secretKey || !userAgent) {
    return res.status(500).json({ message: "Hepsiburada API bilgileri eksik (env)" });
  }

  try {
    // 👇 URL parametresinden status al (örn: /api/hepsiburada-api/orders?status=New)
    const status = (req.query.status || "New").toString();
    const url = `${endpoint}/order/merchant-orders?status=${encodeURIComponent(status)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hepsiburada API Hatası:", response.status, errorText);
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
