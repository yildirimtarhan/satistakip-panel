import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/hepsiburada/orders");
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error("Siparişleri çekerken hata:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <p>Siparişler yükleniyor...</p>;

  return (
    <div>
      <h1>Hepsiburada Siparişleri</h1>
      {orders.length === 0 ? (
        <p>Henüz sipariş yok.</p>
      ) : (
        <ul>
          {orders.map((order, idx) => (
            <li key={idx}>
              <strong>{order.orderNumber}</strong> - {order.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
