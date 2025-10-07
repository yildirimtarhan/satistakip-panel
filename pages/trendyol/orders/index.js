// pages/trendyol/orders/index.js
/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";

export default function TrendyolOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 🔄 Siparişleri API'den çek
  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trendyol/orders");
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Trendyol API bağlantı hatası");

      let items = data?.content?.orders || data?.result || data?.orders || data?.data || [];
      if (!Array.isArray(items)) items = [];

      if (items.length === 0) {
        setError("⚠ Trendyol API bağlantı hatası (örnek veri gösteriliyor)");
        setOrders([
          {
            id: "T-001",
            customerName: "Deneme Müşteri",
            productName: "Test Ürünü",
            status: "Yeni",
            totalPrice: 199.9,
            createdDate: "2025-10-01",
          },
          {
            id: "T-002",
            customerName: "Ahmet Yılmaz",
            productName: "Bluetooth Kulaklık",
            status: "Kargoya Verildi",
            totalPrice: 349.9,
            createdDate: "2025-10-05",
          },
        ]);
      } else {
        setOrders(items);
      }
    } catch (err) {
      console.error("Siparişler alınamadı:", err);
      setError("⚠ Trendyol API bağlantı hatası (örnek veri gösteriliyor)");
      setOrders([
        {
          id: "T-001",
          customerName: "Deneme Müşteri",
          productName: "Test Ürünü",
          status: "Yeni",
          totalPrice: 199.9,
          createdDate: "2025-10-01",
        },
        {
          id: "T-002",
          customerName: "Ahmet Yılmaz",
          productName: "Bluetooth Kulaklık",
          status: "Kargoya Verildi",
          totalPrice: 349.9,
          createdDate: "2025-10-05",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 🔍 Filtreleme işlemleri
  useEffect(() => {
    let filtered = [...orders];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.customerName?.toLowerCase().includes(q) ||
          o.productName?.toLowerCase().includes(q) ||
          o.id?.toLowerCase().includes(q)
      );
    }

    if (startDate) {
      filtered = filtered.filter((o) => new Date(o.createdDate) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter((o) => new Date(o.createdDate) <= new Date(endDate));
    }

    setFilteredOrders(filtered);
  }, [orders, searchQuery, startDate, endDate]);

  // 📤 Excel'e Aktar
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Siparişler");
    XLSX.writeFile(workbook, "trendyol_siparisler.xlsx");
  };

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🛍 Trendyol Siparişleri</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem", flexWrap: "wrap" }}>
        <button onClick={fetchOrders}>🔄 Yenile</button>
        <input
          type="text"
          placeholder="Ara (isim / sipariş no / ürün)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button onClick={exportToExcel}>📊 Excel'e Aktar</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <ul>
        {filteredOrders.map((order) => (
          <li key={order.id} style={{ marginBottom: 8 }}>
            <strong>{order.customerName}</strong> — {order.productName} — {order.status} —{" "}
            {order.totalPrice} ₺ ({order.createdDate})
          </li>
        ))}
      </ul>
    </div>
  );
}
