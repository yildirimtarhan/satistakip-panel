// pages/api/hepsiburada-api/orders/index.js

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const { beginDate, endDate } = req.query;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const auth = process.env.HEPSIBURADA_AUTH;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;
  const baseUrl = process.env.HEPSIBURADA_BASE_URL || "https://oms-external.hepsiburada.com";

  if (!merchantId || !auth || !userAgent) {
    return res.status(500).json({ message: "Hepsiburada API environment değişkenleri eksik." });
  }

  try {
    // ✅ Otomatik paketleme açık olduğu için 'packages' endpoint'ini kullanıyoruz
    const url = `${baseUrl}/packages/merchantid/${merchantId}?offset=0&limit=100&startDate=${encodeURIComponent(beginDate)}&endDate=${encodeURIComponent(endDate)}`;

    console.log("📡 HB Packages URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      console.error("❌ Hepsiburada Packages API Hatası:", response.status, data);
      return res.status(response.status).json({ message: "Paket listesi çekilemedi", status: response.status, error: data });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("🔥 Sunucu Hatası /orders:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
