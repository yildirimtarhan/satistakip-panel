import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const beginDate = "2025-10-01 00:00";
        const endDate = "2025-10-13 23:59";
        const url = `/api/hepsiburada-api/orders?offset=0&limit=100&beginDate=${encodeURIComponent(beginDate)}&endDate=${encodeURIComponent(endDate)}`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("📦 Gelen sipariş verisi:", data);

        if (data.items || (data.content && data.content.items)) {
          setOrders(data.items || data.content.items);
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error("❌ Siparişleri çekerken hata:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;
  if (orders.length === 0) return <div>📭 Şu anda sipariş bulunmamaktadır.</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Hepsiburada Siparişleri</h1>
      <ul>
        {orders.map((order, index) => (
          <li key={index} style={{ marginBottom: "10px" }}>
            <strong>Sipariş No:</strong> {order.orderNumber || order.id} <br />
            <strong>Tarih:</strong> {order.orderDate || "-"} <br />
            <strong>Durum:</strong> {order.status || "-"}
          </li>
        ))}
      </ul>
    </div>
  );
}
