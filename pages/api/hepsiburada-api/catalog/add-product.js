// pages/api/hepsiburada-api/catalog/add-product.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const auth = process.env.HEPSIBURADA_AUTH;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!auth || !merchantId || !userAgent) {
    return res.status(500).json({ message: "Hepsiburada API environment değişkenleri eksik." });
  }

  try {
    const url = `${baseUrl}/listings/merchantid/${merchantId}/products`;
    console.log("📡 Hepsiburada Ürün Gönderme URL:", url);

    // Basit örnek ürün
    const body = [
      {
        "merchantSku": "TEST-URUN-001",
        "hbSku": "",
        "productName": "Test Ürün 1",
        "brand": "TestMarka",
        "quantity": 10,
        "listPrice": 150.00,
        "salePrice": 120.00,
        "vatRate": 20,
        "cargoCompany1": "aras",
        "cargoCompany2": "mng",
        "cargoCompany3": "ups"
      }
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Ürün Gönderme Hatası:", data);
      return res.status(response.status).json({ message: "Ürün gönderilemedi", error: data });
    }

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error("🔥 Sunucu Hatası /catalog/add-product:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
