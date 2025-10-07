// pages/trendyol/orders/index.js
import { useEffect, useState } from "react";

export default function TrendyolOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trendyol/orders");
      const data = await res.json();

      if (!res.ok) {
        console.warn("⚠ Trendyol API hatası:", data);
        throw new Error(data.message || "Trendyol API bağlantı hatası");
      }

      let items = data?.content?.orders || data?.result || data?.data || [];
      if (!Array.isArray(items)) items = [];

      if (items.length === 0) {
        setError("Trendyol API bağlantı hatası (örnek veri gösteriliyor)");
        setOrders([
          {
            id: "TREN12345",
            customerName: "Deneme Müşteri",
            status: "Yeni",
            productName: "Test Ürünü",
          },
        ]);
      } else {
        setOrders(items);
      }
    } catch (err) {
      console.error("Trendyol sipariş listesi alınamadı:", err);
      setError("Trendyol API bağlantı hatası (örnek veri gösteriliyor)");
      setOrders([
        {
          id: "TREN12345",
          customerName: "Deneme Müşteri",
          status: "Yeni",
          productName: "Test Ürünü",
        },
        {
          id: "TREN54321",
          customerName: "Ahmet Yılmaz",
          status: "Kargoya Verildi",
          productName: "Bluetooth Kulaklık",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(
    (o) =>
      o.id?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.productName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🛍 Trendyol Siparişleri</h1>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "8px" }}>
        <button onClick={fetchOrders}>🔄 Yenile</button>
        <input
          type="text"
          placeholder="Ara (isim / sipariş no / ürün)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {error && <span style={{ color: "red" }}>⚠ {error}</span>}
      </div>

      {loading ? (
        <p>⏳ Yükleniyor...</p>
      ) : filteredOrders.length > 0 ? (
        <ul>
          {filteredOrders.map((order, idx) => (
            <li key={idx} style={{ marginBottom: "8px" }}>
              <strong>{order.customerName}</strong> — {order.productName} — {order.status}
            </li>
          ))}
        </ul>
      ) : (
        <p>Hiç sipariş bulunamadı.</p>
      )}
    </div>
  );
}
