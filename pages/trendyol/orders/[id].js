import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function OrderDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/trendyol/orders/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrder(data.order);
        } else {
          console.error("Hata:", data.message);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Sunucu hatası:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p>Yükleniyor...</p>;
  if (!order) return <p>❌ Sipariş bulunamadı.</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>🧾 Sipariş Detayı</h1>
      <p><strong>Sipariş No:</strong> {order.id}</p>
      <p><strong>Müşteri:</strong> {order.customerFirstName} {order.customerLastName}</p>
      <p><strong>Durum:</strong> <StatusBadge status={order.status} /></p>
      <p><strong>Kargo:</strong> {order.cargoProviderName}</p>
      <p><strong>Takip No:</strong> {order.cargoTrackingNumber}</p>
      <p><strong>Tutar:</strong> {order.totalPrice} {order.currencyCode}</p>
    </div>
  );
}

// 🔹 Renkli etiket bileşeni
function StatusBadge({ status }) {
  const colors = {
    Created: "green",
    Cancelled: "red",
    Shipped: "blue",
    Delivered: "darkgreen"
  };

  const color = colors[status] || "gray";

  return (
    <span style={{
      backgroundColor: color,
      color: "white",
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "14px"
    }}>
      {status}
    </span>
  );
}
