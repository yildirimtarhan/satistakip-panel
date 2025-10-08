// pages/api/hepsiburada-api/orders.js

export default async function handler(req, res) {
  try {
    // 1️⃣ Önce token al
    const authResponse = await fetch("https://mpop.hepsiburada.com/api/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.HEPSIBURADA_USERNAME,
        password: process.env.HEPSIBURADA_PASSWORD,
        authenticationType: "INTEGRATOR"
      }),
    });

    if (!authResponse.ok) {
      const errText = await authResponse.text();
      console.error("❌ Kimlik doğrulama başarısız:", authResponse.status, errText);
      return res.status(authResponse.status).json({
        message: "Hepsiburada kimlik doğrulama başarısız",
        status: authResponse.status,
        error: errText
      });
    }

    const authData = await authResponse.json();
    const token = authData.accessToken;

    if (!token) {
      return res.status(400).json({ message: "Token alınamadı", authData });
    }

    // 2️⃣ Token ile siparişleri al
    const ordersUrl = `${process.env.HEPSIBURADA_ORDERS_ENDPOINT}/orders`;
    const ordersResponse = await fetch(ordersUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": process.env.HEPSIBURADA_USER_AGENT,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });

    if (!ordersResponse.ok) {
      const errText = await ordersResponse.text();
      console.error("❌ Sipariş alma hatası:", ordersResponse.status, errText);
      return res.status(ordersResponse.status).json({
        message: "Hepsiburada sipariş alma hatası",
        status: ordersResponse.status,
        error: errText
      });
    }

    const data = await ordersResponse.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ Genel hata:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message
    });
  }
}
