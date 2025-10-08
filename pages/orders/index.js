// pages/orders/index.js
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 📊 Kar-Zarar toplamı için
  const totalProfit = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      const sale = parseFloat(order.salePrice || 0);
      const cost = parseFloat(order.purchasePrice || 0);
      return acc + (sale - cost);
    }, 0);
  }, [filteredOrders]);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hepsiburada-api/orders?status=New");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Hepsiburada API bağlantı hatası");
      }

      let items =
        data?.content?.orders ||
        data?.content ||
        data?.result ||
        data?.data ||
        data?.orders ||
        [];

      if (!Array.isArray(items) || items.length === 0) {
        setError("Hepsiburada API bağlantı hatası (örnek veri gösteriliyor)");
        items = [
          {
            id: "12345",
            customerName: "Deneme Müşteri",
            status: "Yeni",
            productName: "Test Ürünü",
            salePrice: 500,
            purchasePrice: 300,
            createdDate: new Date().toISOString(),
          },
        ];
      }

      setOrders(items);
      setFilteredOrders(items);
    } catch (err) {
      console.error("Sipariş listesi alınamadı:", err);
      setError("Hepsiburada API bağlantı hatası (örnek veri gösteriliyor)");
      const dummy = [
        {
          id: "12345",
          customerName: "Deneme Müşteri",
          status: "Yeni",
          productName: "Test Ürünü",
          salePrice: 500,
          purchasePrice: 300,
          createdDate: new Date().toISOString(),
        },
      ];
      setOrders(dummy);
      setFilteredOrders(dummy);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 🔍 Filtreleme işlemleri
  const handleFilter = () => {
    let filtered = [...orders];

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.customerName?.toLowerCase().includes(s) ||
          o.productName?.toLowerCase().includes(s) ||
          o.id?.toLowerCase().includes(s)
      );
    }

    if (statusFilter !== "Tümü") {
      filtered = filtered.filter((o) => (o.status || "").toLowerCase() === statusFilter.toLowerCase());
    }

    if (startDate) {
      filtered = filtered.filter(
        (o) => new Date(o.createdDate) >= new Date(startDate)
      );
    }

    if (endDate) {
      filtered = filtered.filter(
        (o) => new Date(o.createdDate) <= new Date(endDate)
      );
    }

    setFilteredOrders(filtered);
  };

  useEffect(() => {
    handleFilter();
  }, [search, statusFilter, startDate, endDate, orders]);

  // 📥 Excel'e Aktar
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredOrders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siparişler");
    XLSX.writeFile(wb, "hepsiburada_siparisler.xlsx");
  };

  // 📈 Grafik verisi
  const chartData = useMemo(() => {
    const monthly = {};
    filteredOrders.forEach((order) => {
      const d = new Date(order.createdDate);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const profit = (parseFloat(order.salePrice || 0) - parseFloat(order.purchasePrice || 0)) || 0;
      monthly[key] = (monthly[key] || 0) + profit;
    });

    return Object.entries(monthly).map(([month, profit]) => ({
      month,
      profit,
    }));
  }, [filteredOrders]);

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>📦 Hepsiburada Siparişleri</h1>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={fetchOrders}>🔄 Yenile</button>
        <input
          type="text"
          placeholder="🔍 Sipariş ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>Tümü</option>
          <option>Yeni</option>
          <option>Kargoya Verildi</option>
          <option>İptal</option>
          <option>İade</option>
        </select>
        <button onClick={exportToExcel}>📊 Excel'e Aktar</button>
      </div>

      {error && <p style={{ color: "red" }}>⚠ {error}</p>}

      <p><b>💰 Toplam Kar:</b> {totalProfit.toFixed(2)} ₺</p>

      <ul>
        {filteredOrders.map((order, idx) => (
          <li key={order.id + "-" + idx}>
            <Link href={`/orders/${order.id}`}>
              {order.customerName} — {order.productName} — {order.status} —{" "}
              {new Date(order.createdDate).toLocaleDateString()}
            </Link>
          </li>
        ))}
      </ul>

      {/* 📈 Satış Grafik Alanı */}
      <div style={{ marginTop: "2rem" }}>
        <h3>📈 Aylık Kar Grafiği</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="profit" stroke="#82ca9d" />
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
