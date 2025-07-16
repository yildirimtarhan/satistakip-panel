import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function TrendyolOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/trendyol/orders");
        const data = await res.json();

        if (data.success) {
          setOrders(data.orders.content || []);
        } else {
          setError("Sipariş verisi alınamadı.");
        }
      } catch (err) {
        console.error("Hata:", err);
        setError("Sunucu hatası: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const handleClick = (id) => {
    router.push(`/trendyol/orders/${id}`);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>🛒 Trendyol Siparişleri</h1>

      {loading && <p>Yükleniyor...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <ul>
        {orders.length === 0 && !loading && <li>Hiç sipariş bulunamadı.</li>}
        {orders.map((order) => (
          <li
            key={order.id}
            style={{ cursor: "pointer", marginBottom: "10px" }}
            onClick={() => handleClick(order.id)}
          >
            🧾 Sipariş No: {order.id} — {order.customerFirstName} {order.customerLastName}
          </li>
        ))}
      </ul>
    </div>
  );
}
