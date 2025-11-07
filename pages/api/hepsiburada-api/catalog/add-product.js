// 📁 /pages/api/hepsiburada-api/catalog/add-product.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
  const auth = process.env.HEPSIBURADA_AUTH;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  // ✅ Ortam değişkenleri kontrolü
  if (!auth || !merchantId || !userAgent || !baseUrl) {
    return res.status(500).json({ message: "Eksik environment değişkeni" });
  }

  try {
    // ✅ Katalog API endpoint (doğru yol)
    const url = `${baseUrl}/api/products`;

    console.log("📡 Hepsiburada Ürün Gönderme URL:", url);

    // Test için örnek ürün verisi (ERP’den gelecek ürün formatına uygun)
    const body = [
      {
        merchantId: merchantId,
        merchantSku: "ERP-TEST-001",
        barcode: "1234567890001",
        productName: "SatışTakip Test Ürün",
        brand: "Tigdes",
        categoryId: "60000122", // örnek kategori kodu
        description: "SatışTakip ERP üzerinden test amaçlı eklenmiştir.",
        quantity: 15,
        listPrice: 100.0,
        salePrice: 89.9,
        vatRate: 20,
        cargoCompany1: "aras",
        cargoCompany2: "mng",
        cargoCompany3: "ups"
      }
    ];

    // ✅ İstek gönder
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

    // ✅ Hata kontrolü
    if (!response.ok) {
      console.error("❌ Ürün gönderme hatası:", data);
      return res.status(response.status).json({
        ok: false,
        message: "❌ Hepsiburada API hatası",
        raw: data,
      });
    }

    // ✅ Başarılı yanıt
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
