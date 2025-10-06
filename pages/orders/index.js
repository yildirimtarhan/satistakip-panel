// pages/orders/index.js

import Link from "next/link";
import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      // İstediğin statü ile çağırabilirsin: ?status=New | Invoiced | Shipped ...
      const res = await fetch("/api/hepsiburada-api/orders?status=New");
      const data = await res.json();

      if (!res.ok) {
        console.warn("Hepsiburada API hatası:", data);
        throw new Error(data.message || "Hepsiburada API hatası");
      }

      // Hepsiburada yanıt yapısı değişebileceği için esnek eşleme:
      let items =
        data?.content?.orders ||
        data?.content ||
        data?.result ||
        data?.data ||
        data?.orders ||
        [];

      if (!Array.isArray(items)) items = [];

      // Boşsa yine dummy göster
      if (items.length === 0) {
        setError("Hepsiburada API hatası (dummy veri gösteriliyor)");
        setOrders([
          { id: "12345", customerName: "Deneme Müşteri", status: "New" },
        ]);
      } else {
        setOrders(items);
      }
    } catch (err) {
      console.error("Sipariş listesi alınamadı:", err);
      setError("Hepsiburada API hatası (dummy veri gösteriliyor)");
      setOrders([{ id: "12345", customerName: "Deneme Müşteri", status: "New" }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <p>⏳ Yükleniyor...</p>;

  const displayId = (o) =>
    o.id || o.orderNumber || o.merchantOrderId || o.orderId || o.orderNo || "unknown";

  const displayName = (o) =>
    o.customerName ||
    `${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim() ||
    "Müşteri";

  const displayStatus = (o) =>
    o.status || o.orderStatus || o.statusName || "—";

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "1rem" }}>Siparişler</h1>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "8px" }}>
        <button onClick={fetchOrders}>🔄 Yenile</button>
        {error && <span style={{ color: "red" }}>⚠ {error}</span>}
      </div>

      <ul>
        {orders.map((order, idx) => {
          const oid = displayId(order);
          const name = displayName(order);
          const st = displayStatus(order);
          const href = oid !== "unknown" ? `/orders/${oid}` : undefined;

          return (
            <li key={oid + "-" + idx} style={{ marginBottom: 8 }}>
              {href ? (
                <Link href={href}>{name} - {st}</Link>
              ) : (
                <span>{name} - {st}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
