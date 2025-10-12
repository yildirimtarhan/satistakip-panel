// pages/api/hepsiburada-api/packages/[packageId].js

export default async function handler(req, res) {
  const { packageId } = req.query;

  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  // 🌍 Ortam değişkenlerini al
  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!baseUrl || !merchantId || !secretKey || !userAgent) {
    return res.status(500).json({
      message: "Hepsiburada API environment değişkenleri eksik.",
    });
  }

  try {
    // 📌 Paket sorgulama endpoint'i
    const url = `${baseUrl}/packages/merchantid/${merchantId}/${packageId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
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
      console.error("Paket sorgulama hatası:", response.status, data);
      return res.status(response.status).json({
        message: "Hepsiburada paket sorgulama başarısız",
        status: response.status,
        error: data,
      });
    }

    return res.status(200).json({
      success: true,
      package: data,
    });
  } catch (error) {
    console.error("Sunucu Hatası [packageId].js:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
