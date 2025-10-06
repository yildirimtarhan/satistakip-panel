// pages/orders/index.js

import Link from "next/link";
import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/hepsiburada-api/orders");
        const data = await res.json();

        if (!res.ok) {
          console.warn("Hepsiburada API hatası:", data);
          throw new Error(data.message || "Hepsiburada API hatası");
        }

        // Eğer API boş dönerse → Dummy sipariş göster
        if (!data || data.length === 0) {
          setOrders([
            {
              id: "12345",
              customerName: "Deneme Müşteri",
              status: "New",
            },
          ]);
        } else {
          setOrders(data);
        }
      } catch (err) {
        console.error("Sipariş listesi alınamadı:", err);
        setError("Hepsiburada API hatası (dummy veri gösteriliyor)");
        // Hata olsa bile listeyi boş bırakma → Dummy veri ekle
        setOrders([
          {
            id: "12345",
            customerName: "Deneme Müşteri",
            status: "New",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Siparişler</h1>
      {error && <p style={{ color: "red" }}>⚠ {error}</p>}
      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            <Link href={`/orders/${order.id}`}>
              {order.customerName} - {order.status}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
