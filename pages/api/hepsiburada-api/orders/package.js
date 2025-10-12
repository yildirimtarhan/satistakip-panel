// pages/api/hepsiburada-api/orders/package.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  const { orderNumber, cargoCompany, shippingAddress, lines } = req.body;

  // 🧱 Environment değişkenlerini çekiyoruz
  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!baseUrl || !merchantId || !secretKey || !userAgent) {
    return res.status(500).json({ message: "Hepsiburada API environment değişkenleri eksik." });
  }

  try {
    // 📌 Paket oluşturma endpoint'i
    const url = `${baseUrl}/packages/create`;

    const payload = {
      orderNumber,
      cargoCompany: cargoCompany || "Yurtiçi Kargo", // Default taşıyıcı
      shippingAddress: shippingAddress || {
        city: "İstanbul",
        district: "Kadıköy",
        address: "TEST ADRES",
      },
      lines: lines || [
        {
          quantity: 1,
          productId: "TEST-ÜRÜN-ID",
          hbSku: "TEST-HB-SKU",
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      console.error("Hepsiburada Paket Oluşturma Hatası:", response.status, data);
      return res.status(response.status).json({
        message: "Hepsiburada paket oluşturma başarısız",
        status: response.status,
        error: data,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Paket oluşturma başarılı",
      data,
    });
  } catch (error) {
    console.error("Sunucu Hatası /package.js:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
