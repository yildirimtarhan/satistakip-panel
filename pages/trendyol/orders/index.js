// pages/trendyol/orders/index.js
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function TrendyolOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [error, setError] = useState("");

  // Ciro ve kar verileri
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/trendyol/orders");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Trendyol API bağlantı hatası");
      }

      setOrders(data.content.orders);
      setFilteredOrders(data.content.orders);
    } catch (err) {
      console.error("Trendyol API hatası:", err);
      setError("Trendyol API bağlantı hatası (örnek veri gösteriliyor)");
      const dummy = [
        {
          id: "TREN12345",
          customerName: "Deneme Müşteri",
          productName: "Test Ürünü",
          status: "Yeni",
          salePrice: 299.9,
          purchasePrice: 200.0,
          createdDate: "2025-10-08T11:28:14",
        },
        {
          id: "TREN54321",
          customerName: "Ahmet Yılmaz",
          productName: "Bluetooth Kulaklık",
          status: "Kargoya Verildi",
          salePrice: 499.0,
          purchasePrice: 320.0,
          createdDate: "2025-10-05T09:10:00",
        },
      ];
      setOrders(dummy);
      setFilteredOrders(dummy);
    }
  };

  // 📅 Filtreleme
  const handleFilter = () => {
    let result = [...orders];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (o) =>
          o.customerName.toLowerCase().includes(lower) ||
          o.productName.toLowerCase().includes(lower) ||
          o.id.toLowerCase().includes(lower)
      );
    }

    if (startDate) {
      result = result.filter(
        (o) => new Date(o.createdDate) >= new Date(startDate)
      );
    }
    if (endDate) {
      result = result.filter(
        (o) => new Date(o.createdDate) <= new Date(endDate)
      );
    }

    if (statusFilter !== "Tümü") {
      result = result.filter((o) => o.status === statusFilter);
    }

    setFilteredOrders(result);
    calculateSummary(result);
  };

  // 💰 Ciro ve Kâr Hesaplama
  const calculateSummary = (list) => {
    const now = new Date();
    let daily = 0,
      weekly = 0,
      monthly = 0,
      profit = 0;

    list.forEach((o) => {
      const orderDate = new Date(o.createdDate);
      const sale = o.salePrice || 0;
      const cost = o.purchasePrice || 0;
      const kar = sale - cost;
      profit += kar;

      const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);

      if (diffDays <= 1) daily += sale;
      if (diffDays <= 7) weekly += sale;
      if (orderDate.getMonth() === now.getMonth()) monthly += sale;
    });

    setDailyRevenue(daily);
    setWeeklyRevenue(weekly);
    setMonthlyRevenue(monthly);
    setTotalProfit(profit);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [searchTerm, startDate, endDate, statusFilter, orders]);

  // 📊 Grafik için veri hazırlama
  const chartData = filteredOrders.reduce((acc, order) => {
    const dateKey = new Date(order.createdDate).toLocaleDateString("tr-TR");
    const existing = acc.find((item) => item.date === dateKey);
    const sale = order.salePrice || 0;
    if (existing) {
      existing.revenue += sale;
    } else {
      acc.push({ date: dateKey, revenue: sale });
    }
    return acc;
  }, []);

  const statusBadge = (status) => {
    const base = "px-2 py-1 rounded text-white text-sm";
    const s = {
      Yeni: "#2563eb",
      "Kargoya Verildi": "#16a34a",
      İptal: "#dc2626",
      İade: "#f97316",
    };
    return (
      <span
        className={base}
        style={{ background: s[status] || "#6b7280", fontSize: "0.75rem" }}
      >
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: "1.5rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: "bold" }}>🛍️ Trendyol Siparişleri</h1>

      {/* 📌 Performans Kartları */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", margin: "1rem 0" }}>
        <div style={{ background: "#f3f4f6", padding: "1rem", borderRadius: "8px" }}>
          <h3>Günlük Ciro</h3>
          <p style={{ fontWeight: "bold" }}>{dailyRevenue.toFixed(2)} ₺</p>
        </div>
        <div style={{ background: "#f3f4f6", padding: "1rem", borderRadius: "8px" }}>
          <h3>Haftalık Ciro</h3>
          <p style={{ fontWeight: "bold" }}>{weeklyRevenue.toFixed(2)} ₺</p>
        </div>
        <div style={{ background: "#f3f4f6", padding: "1rem", borderRadius: "8px" }}>
          <h3>Aylık Ciro</h3>
          <p style={{ fontWeight: "bold" }}>{monthlyRevenue.toFixed(2)} ₺</p>
        </div>
        <div style={{ background: "#f3f4f6", padding: "1rem", borderRadius: "8px" }}>
          <h3>Toplam Kâr</h3>
          <p style={{ fontWeight: "bold", color: totalProfit >= 0 ? "green" : "red" }}>
            {totalProfit.toFixed(2)} ₺
          </p>
        </div>
      </div>

      {/* 🔍 Filtre Alanı */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <button onClick={fetchOrders}>🔄 Yenile</button>
        <input
          type="text"
          placeholder="🔍 Arama (isim / sipariş no / ürün)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
      </div>

      {error && <p style={{ color: "red" }}>⚠ {error}</p>}

      {/* 📈 Satış Grafiği */}
      <div style={{ height: 300, marginBottom: "1.5rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 📋 Tablo */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
            <th style={{ padding: "8px" }}>Müşteri</th>
            <th style={{ padding: "8px" }}>Ürün</th>
            <th style={{ padding: "8px" }}>Durum</th>
            <th style={{ padding: "8px" }}>Satış ₺</th>
            <th style={{ padding: "8px" }}>Alış ₺</th>
            <th style={{ padding: "8px" }}>Kâr/Zarar ₺</th>
            <th style={{ padding: "8px" }}>Tarih</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((o, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "8px" }}>
                <Link href={`/trendyol/orders/${o.id}`}>
                  <span style={{ color: "#2563eb", cursor: "pointer" }}>{o.customerName}</span>
                </Link>
              </td>
              <td style={{ padding: "8px" }}>{o.productName}</td>
              <td style={{ padding: "8px" }}>{statusBadge(o.status)}</td>
              <td style={{ padding: "8px" }}>{(o.salePrice || 0).toFixed(2)}</td>
              <td style={{ padding: "8px" }}>{(o.purchasePrice || 0).toFixed(2)}</td>
              <td style={{ padding: "8px", color: (o.salePrice - o.purchasePrice) >= 0 ? "green" : "red" }}>
                {(o.salePrice - o.purchasePrice).toFixed(2)}
              </td>
              <td style={{ padding: "8px" }}>
                {new Date(o.createdDate).toLocaleString("tr-TR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
