// pages/trendyol/orders/index.js
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

export default function TrendyolOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trendyol/orders");
      const data = await res.json();

      if (!res.ok) {
        console.warn("Trendyol API hatası:", data);
        throw new Error(data.message || "Trendyol API bağlantı hatası");
      }

      let items = data?.content?.orders || data?.orders || data?.data || [];

      if (!Array.isArray(items)) items = [];

      if (items.length === 0) {
        setError("Trendyol API bağlantı hatası (örnek veri gösteriliyor)");
        setOrders([
          {
            id: "TREN12345",
            customerName: "Deneme Müşteri",
            status: "Yeni",
            productName: "Test Ürünü",
            date: "2025-10-08",
          },
        ]);
      } else {
        setOrders(items);
      }
    } catch (err) {
      console.error("Trendyol siparişleri alınamadı:", err);
      setError("Trendyol API bağlantı hatası (örnek veri gösteriliyor)");
      setOrders([
        {
          id: "TREN12345",
          customerName: "Deneme Müşteri",
          status: "Yeni",
          productName: "Test Ürünü",
          date: "2025-10-08",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filteredOrders = orders.filter((o) => {
    const id = o.id?.toString().toLowerCase() || "";
    const name = o.customerName?.toLowerCase() || "";
    const product = o.productName?.toLowerCase() || "";
    const searchTerm = search.toLowerCase();
    return id.includes(searchTerm) || name.includes(searchTerm) || product.includes(searchTerm);
  });

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "1rem" }}>🛍 Trendyol Siparişleri</h1>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "8px" }}>
        <button onClick={fetchOrders}>🔄 Yenile</button>
        <input
          type="text"
          placeholder="🔍 Sipariş ara..."
          value={search}
          onChange={handleSearch}
        />
        {error && <span style={{ color: "red" }}>⚠ {error}</span>}
      </div>

      <ul>
        {filteredOrders.map((order, idx) => (
          <li key={order.id + "-" + idx} style={{ marginBottom: 8 }}>
            <Link href={`/trendyol/orders/${order.id}`}>
              {order.customerName} - {order.status} - 🛍 {order.productName} - 📅 {order.date}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
