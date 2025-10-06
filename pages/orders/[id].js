// pages/orders/[id].js

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query; // URL'den ID al
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return; // id gelmeden fetch yapma

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/hepsiburada-api/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Sipariş alınamadı");
        }

        setOrder(data.data);
      } catch (err) {
        console.error("Sipariş detay hatası:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) return <p>⏳ Yükleniyor...</p>;
  if (error) return <p style={{ color: "red" }}>⚠ {error}</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Sipariş Detayı</h1>
      <p><strong>Sipariş No:</strong> {order.orderNumber}</p>
      <p><strong>Müşteri:</strong> {order.customerName}</p>
      <p><strong>Durum:</strong> {order.status}</p>
      <p><strong>Tutar:</strong> {order.totalAmount} ₺</p>
      <p><strong>Oluşturulma:</strong> {new Date(order.createdAt).toLocaleString()}</p>
    </div>
  );
}
