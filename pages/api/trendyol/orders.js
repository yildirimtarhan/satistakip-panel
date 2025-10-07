// pages/api/trendyol/orders.js
export default async function handler(req, res) {
  try {
    // Şimdilik dummy veri dönüyoruz
    const dummyOrders = [
      {
        id: "TREN12345",
        customerName: "Deneme Müşteri",
        status: "Yeni",
        productName: "Test Ürünü",
      },
      {
        id: "TREN54321",
        customerName: "Ahmet Yılmaz",
        status: "Kargoya Verildi",
        productName: "Bluetooth Kulaklık",
      },
    ];

    return res.status(200).json({ success: true, content: { orders: dummyOrders } });
  } catch (error) {
    console.error("Trendyol API hata:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
