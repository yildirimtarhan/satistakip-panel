// pages/api/hepsiburada-api/[id].js

export default function handler(req, res) {
  const { id } = req.query;

  // ✅ Şimdilik dummy (örnek) veri dönüyoruz
  // Buraya daha sonra gerçek Hepsiburada tekil sipariş sorgusu eklenecek
  return res.status(200).json({
    success: true,
    message: "Tekil sipariş endpoint başarıyla çalışıyor ✅",
    orderId: id,
    data: {
      orderNumber: id,
      customerName: "Deneme Müşteri",
      status: "New",
      totalAmount: 149.90,
      createdAt: new Date().toISOString(),
    },
  });
}
