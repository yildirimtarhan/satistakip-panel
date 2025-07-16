import { useEffect, useState } from "react";

export default function TrendyolOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/trendyol/orders");
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Bilinmeyen hata");
        } else {
          setOrders(json.content || []);
        }
      } catch (err) {
        console.error("İstek hatası:", err);
        setError("Sunucuya ulaşılamıyor.");
      }
    };

    fetchOrders();
  }, []);

  if (error) {
    return <div className="text-red-500 font-bold">⚠ {error}</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Trendyol Siparişleri</h1>
      {orders.length === 0 ? (
        <p>Hiç sipariş bulunamadı.</p>
      ) : (
        <ul>
          {orders.map((order) => (
            <li key={order.id}>
              {order.customerFirstName} {order.customerLastName} - {order.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
