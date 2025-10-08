// pages/trendyol/orders/index.js

import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";

export default function TrendyolOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Hepsi");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // 🧠 Siparişleri çek
  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trendyol/orders");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Trendyol API bağlantı hatası");
      }

      setOrders(data.content.orders || []);
      setFilteredOrders(data.content.orders || []);
    } catch (err) {
      console.error("Sipariş listesi alınamadı:", err);
      setError("Trendyol API bağlantı hatası (dummy veri gösteriliyor)");
      const dummy = [
        {
          id: "TREN12345",
          customerName: "Deneme Müşteri",
          status: "Yeni",
          productName: "Test Ürünü",
          date: "2025-10-01",
          total: 149.9,
        },
        {
          id: "TREN54321",
          customerName: "Ahmet Yılmaz",
          status: "Kargoya Verildi",
          productName: "Bluetooth Kulaklık",
          date: "2025-10-05",
          total: 349.0,
        },
      ];
      setOrders(dummy);
      setFilteredOrders(dummy);
    } finally {
      setLoading(false);
    }
  };

  // 🧠 Filtreleme işlemleri
  const handleFilter = useCallback(() => {
    let filtered = [...orders];

    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((o) =>
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.productName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "Hepsi") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((o) => {
        const d = new Date(o.date);
        return d >= new Date(dateRange.start) && d <= new Date(dateRange.end);
      });
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, dateRange]);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [handleFilter]); // ✅ dependency eklendi

  // 🧠 Excel'e aktar
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredOrders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siparişler");
    XLSX.writeFile(wb, "trendyol_siparisler.xlsx");
  };

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "1.5rem", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "1rem" }}>🛍️ Trendyol Siparişleri</h1>

      {/* Filtre Alanı */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="🔍 Sipariş veya müşteri ara"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>Hepsi</option>
          <option>Yeni</option>
          <option>Kargoya Verildi</option>
          <option>İptal Edildi</option>
          <option>İade Edildi</option>
        </select>

        <div>
          <label>Başlangıç: </label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
        </div>
        <div>
          <label>Bitiş: </label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>

        <button onClick={exportToExcel}>📊 Excel'e Aktar</button>
        {error && <span style={{ color: "red" }}>⚠ {error}</span>}
      </div>

      {/* Tablo */}
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead style={{ background: "#f4f4f4" }}>
          <tr>
            <th>Sipariş No</th>
            <th>Müşteri</th>
            <th>Ürün Adı</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th>Tutar (₺)</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center" }}>
                Kriterlere uygun sipariş bulunamadı.
              </td>
            </tr>
          ) : (
            filteredOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.customerName}</td>
                <td>{order.productName}</td>
                <td>{order.status}</td>
                <td>{order.date}</td>
                <td>{order.total}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
