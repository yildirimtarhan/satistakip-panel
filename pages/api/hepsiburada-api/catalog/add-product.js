// 📁 /pages/api/hepsiburada-api/catalog/add-product.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  const baseUrl = process.env.HEPSIBURADA_BASE_URL; // ✅ mpop-sit.hepsiburada.com
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const auth = process.env.HEPSIBURADA_AUTH;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!auth || !merchantId || !userAgent || !baseUrl) {
    return res.status(500).json({ message: "Eksik environment değişkeni" });
  }

  try {
    const url = `${baseUrl}/api/products`; // ✅ doğru endpoint

    console.log("📡 Hepsiburada Ürün Gönderme URL:", url);

    // 🧩 Katalog formatına uygun test ürünü
    const body = [
      {
        merchant: merchantId,
        merchantSku: "ERP-TEST-001",
        barcode: "1234567890001",
        productName: "SatışTakip Test Ürün",
        brand: "Tigdes",
        categoryId: 60000122, // leaf kategori ID
        description: "SatışTakip ERP üzerinden test amaçlı eklenmiştir.",
        guaranteePeriod: "24", // ay
        quantity: "15",
        stockCode: "ST-001",
        listPrice: "100,00",
        salePrice: "89,90",
        vatRate: 20,
        dimensionalWeight: "0.5",
        cargoCompany1: "aras",
        cargoCompany2: "mng",
        cargoCompany3: "ups",
        images: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Hepsiburada_logo.svg/320px-Hepsiburada_logo.svg.png"
        ],
        attributes: {
          Renk: "Mavi",
          Beden: "L",
          Materyal: "Pamuk"
        }
      }
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": userAgent,
        "merchantid": merchantId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Ürün gönderme hatası:", data);
      return res.status(response.status).json({
        ok: false,
        message: "❌ Hepsiburada API hatası",
        status: response.status,
        raw: data,
      });
    }

    console.log("✅ Ürün gönderimi başarılı:", data);
    return res.status(200).json({
      ok: true,
      message: "✅ Ürün başarıyla Hepsiburada katalog sistemine gönderildi",
      data,
    });

  } catch (err) {
    console.error("🔥 Sunucu hatası /add-product:", err);
    return res.status(500).json({
      ok: false,
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
