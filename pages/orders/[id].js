// pages/orders/[id].js

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/hepsiburada-api/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Sipariş getirilemedi");
        }

        setOrder(data);
      } catch (err) {
        console.error("Sipariş detayı alınamadı:", err);
        setError("Sipariş detayı alınamadı");
      }
    };

    fetchOrder();
  }, [id]);

  if (error) return <p style={{ color: "red" }}>⚠ {error}</p>;
  if (!order) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📄 Sipariş Detayı</h1>
      <p><b>Sipariş No:</b> {id}</p>
      <p><b>Müşteri:</b> {order.customerName || "Bilinmiyor"}</p>
      <p><b>Durum:</b> {order.status || "Bilinmiyor"}</p>
      <p><b>Tutar:</b> {order.totalAmount || "0"} ₺</p>
      <p><b>Oluşturulma:</b> {order.createdAt ? new Date(order.createdAt).toLocaleString("tr-TR") : "Bilinmiyor"}</p>
    </div>
  );
}
