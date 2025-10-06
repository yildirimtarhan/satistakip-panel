import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

export default function OrderDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    if (!id) return;

    // ✅ Şimdilik gerçek API yerine mock veri kullanıyoruz
    setOrder({
      id,
      customerFirstName: "Test",
      customerLastName: "Müşteri",
      status: "Bekliyor",
      totalPrice: "249.99 TL",
      orderDate: "2025-10-06",
    });
  }, [router, id]);

  if (error) {
    return <div className="text-red-500 font-bold">⚠ {error}</div>;
  }

  if (!order) {
    return <p>Yükleniyor...</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">📦 Sipariş Detayı</h1>
      <p><strong>Sipariş ID:</strong> {order.id}</p>
      <p><strong>Müşteri:</strong> {order.customerFirstName} {order.customerLastName}</p>
      <p><strong>Durum:</strong> {order.status}</p>
      <p><strong>Toplam Fiyat:</strong> {order.totalPrice}</p>
      <p><strong>Tarih:</strong> {order.orderDate}</p>
    </div>
  );
}
// pages/api/hepsiburada-api/[id].js

export default function handler(req, res) {
  const { id } = req.query;

  // ✅ Şimdilik gerçek API çağrısı yapmıyoruz.
  // Sadece test amaçlı örnek (dummy) bir yanıt dönüyoruz.
  return res.status(200).json({
    message: "Tekil sipariş endpoint çalışıyor ✅",
    id,
  });
}
