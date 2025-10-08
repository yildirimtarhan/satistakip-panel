// pages/api/hepsiburada-api/orders.js

export default async function handler(req, res) {
  try {
    // 🔸 1. ENV değişkenlerini al
    const username = process.env.HEPSIBURADA_USERNAME;
    const password = process.env.HEPSIBURADA_PASSWORD;
    const userAgent = process.env.HEPSIBURADA_USER_AGENT;
    const ordersEndpoint = process.env.HEPSIBURADA_ORDERS_ENDPOINT;
    const authEndpoint = process.env.HEPSIBURADA_CATALOG_ENDPOINT?.replace(/\/$/, "") + "/api/authenticate";

    // Kontrol
    if (!username || !password || !userAgent || !ordersEndpoint || !authEndpoint) {
      return res.status(500).json({ message: "Hepsiburada ENV bilgileri eksik" });
    }

    // 🔸 2. Authenticate isteği
    console.log("🟡 Hepsiburada authenticate başlıyor:", authEndpoint);

    const authResponse = await fetch(authEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify({
        username,
        password,
        authenticationType: "INTEGRATOR",
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error("❌ Authenticate hatası:", authResponse.status, errorText);
      return res.status(authResponse.status).json({
        message: "Hepsiburada kimlik doğrulama başarısız",
        status: authResponse.status,
        error: errorText,
      });
    }

    const authData = await authResponse.json();
    const token = authData?.id_token || authData?.access_token || authData?.token;

    if (!token) {
      console.error("❌ Token alınamadı:", authData);
      return res.status(401).json({ message: "Token alınamadı", response: authData });
    }

    console.log("✅ Token başarıyla alındı");

    // 🔸 3. Siparişleri çekme isteği
    const ordersUrl = `${ordersEndpoint}/orders`;
    console.log("📡 Orders URL:", ordersUrl);

    const ordersResponse = await fetch(ordersUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error("❌ Orders isteği hatası:", ordersResponse.status, errorText);
      return res.status(ordersResponse.status).json({
        message: "Hepsiburada sipariş isteği başarısız",
        status: ordersResponse.status,
        error: errorText,
      });
    }

    const ordersData = await ordersResponse.json();
    console.log("✅ Sipariş verisi alındı");

    return res.status(200).json(ordersData);
  } catch (error) {
    console.error("❌ Genel Hata:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
