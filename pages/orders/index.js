// pages/orders/index.js
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hepsiburada-api/orders?status=New");
      const data = await res.json();

      if (!res.ok) {
        console.warn("Hepsiburada API hatası:", data);
        throw new Error(data.message || "Hepsiburada API bağlantı hatası");
      }

      let items =
        data?.content?.orders ||
        data?.content ||
        data?.result ||
        data?.data ||
        data?.orders ||
        [];

      if (!Array.isArray(items)) items = [];

      if (items.length === 0) {
        setError("Hepsiburada API bağlantı hatası (örnek veri gösteriliyor)");
        setOrders([
          {
            id: "12345",
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
      console.error("Sipariş listesi alınamadı:", err);
      setError("Hepsiburada API bağlantı hatası (örnek veri gösteriliyor)");
      setOrders([
        {
          id: "12345",
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

  const displayId = (o) =>
    o.id || o.orderNumber || o.merchantOrderId || o.orderId || o.orderNo || "bilinmiyor";

  const displayName = (o) =>
    o.customerName ||
    `${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim() ||
    "Müşteri";

  const displayStatus = (o) =>
    o.status || o.orderStatus || o.statusName || "—";

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "1rem" }}>📦 Hepsiburada Siparişleri</h1>

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
        {filteredOrders.map((order, idx) => {
          const oid = displayId(order);
          const name = displayName(order);
          const st = displayStatus(order);
          const product = order.productName || "Ürün adı yok";
          const date = order.date || "Tarih yok";
          const href = oid !== "bilinmiyor" ? `/orders/${oid}` : undefined;

          return (
            <li key={oid + "-" + idx} style={{ marginBottom: 8 }}>
              {href ? (
                <Link href={href}>
                  {name} - {st} - 🛍 {product} - 📅 {date}
                </Link>
              ) : (
                <span>
                  {name} - {st} - 🛍 {product} - 📅 {date}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
