import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);              // 🆕 Sayfa numarası
  const [limit] = useState(50);                     // 🆕 Sayfa başına kayıt
  const [totalCount, setTotalCount] = useState(0);  // 🆕 Toplam kayıt sayısı

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const queryParams = new URLSearchParams();
      if (dateRange.start && dateRange.end) {
        queryParams.append("beginDate", dateRange.start);
        queryParams.append("endDate", dateRange.end);
      }
      if (statusFilter) {
        queryParams.append("status", statusFilter);
      }
      queryParams.append("page", page);
      queryParams.append("limit", limit);

      const res = await fetch(`/api/hepsiburada-api/orders?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Hepsiburada API bağlantı hatası");

      let items =
        data?.content?.items ||
        data?.content?.orders ||
        data?.content ||
        data?.orders ||
        data?.data ||
        [];

      if (!Array.isArray(items) || items.length === 0) {
        setError("Hepsiburada API boş döndü (örnek veri gösteriliyor)");
        items = [
          {
            id: "HB12345",
            customerName: "Ali Veli",
            productName: "Akıllı Saat",
            status: "Yeni",
            createdDate: new Date().toISOString(),
            purchasePrice: 300,
            salePrice: 450,
          },
          {
            id: "HB54321",
            customerName: "Ayşe Yılmaz",
            productName: "Kulaklık",
            status: "Kargoya Verildi",
            createdDate: new Date().toISOString(),
            purchasePrice: 100,
            salePrice: 150,
          },
        ];
      }

      setTotalCount(data?.content?.totalCount || 0);
      setOrders(items);
      setFilteredOrders(items);
    } catch (err) {
      console.error("Hepsiburada sipariş listesi alınamadı:", err);
      setError("Hepsiburada API bağlantı hatası (örnek veri gösteriliyor)");
    } finally {
      setLoading(false);
    }
  }, [dateRange, statusFilter, page, limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    filterOrders(term, dateRange);
  };

  const handleDateFilter = (field, value) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    filterOrders(searchTerm, newRange);
  };

  const filterOrders = (term, range) => {
    let filtered = [...orders];
    if (term) {
      filtered = filtered.filter(
        (o) =>
          o.customerName?.toLowerCase().includes(term) ||
          o.productName?.toLowerCase().includes(term) ||
          o.id?.toLowerCase().includes(term)
      );
    }
    if (range.start) {
      filtered = filtered.filter(
        (o) => new Date(o.createdDate) >= new Date(range.start)
      );
    }
    if (range.end) {
      filtered = filtered.filter(
        (o) => new Date(o.createdDate) <= new Date(range.end)
      );
    }
    setFilteredOrders(filtered);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hepsiburada Siparişler");
    XLSX.writeFile(workbook, "hepsiburada_siparisler.xlsx");
  };

  const displayStatus = (status) => {
    if (!status) return "—";
    const s = status.toLowerCase();
    if (s.includes("yeni")) return "🟡 Yeni";
    if (s.includes("kargo")) return "🔵 Kargoda";
    if (s.includes("iptal")) return "🔴 İptal";
    if (s.includes("iade")) return "🟠 İade";
    return status;
  };

  const calculateProfit = (o) => {
    if (o.salePrice && o.purchasePrice) {
      return (o.salePrice - o.purchasePrice).toFixed(2);
    }
    return 0;
  };

  const getChartData = () => {
    const grouped = {};
    filteredOrders.forEach((order) => {
      const date = new Date(order.createdDate);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      const profit = parseFloat(calculateProfit(order));
      if (!grouped[key]) grouped[key] = { date: key, ciro: 0, kar: 0 };
      grouped[key].ciro += order.salePrice || 0;
      grouped[key].kar += profit;
    });
    return Object.values(grouped);
  };

  const chartData = getChartData();
  const totalPages = Math.ceil(totalCount / limit);

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📦 Hepsiburada Siparişleri</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="🔍 Sipariş / Müşteri / Ürün ara..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => handleDateFilter("start", e.target.value)}
        />
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => handleDateFilter("end", e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="New">Yeni</option>
          <option value="Shipped">Kargoya Verildi</option>
          <option value="Cancelled">İptal</option>
          <option value="Returned">İade</option>
        </select>
        <button onClick={fetchOrders}>🔄 Yenile</button>
        <button onClick={exportToExcel}>📊 Excel</button>
        {error && <span style={{ color: "red" }}>⚠ {error}</span>}
      </div>

      {/* 📊 Tablon */}
      <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
        <thead>
          <tr>
            <th>Sipariş No</th>
            <th>Müşteri</th>
            <th>Ürün</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th>Alış ₺</th>
            <th>Satış ₺</th>
            <th>Kar / Zarar ₺</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((o, i) => (
            <tr key={i}>
              <td>
                <Link href={`/orders/${o.id}`}>{o.id}</Link>
              </td>
              <td>{o.customerName}</td>
              <td>{o.productName || "—"}</td>
              <td>{displayStatus(o.status)}</td>
              <td>{new Date(o.createdDate).toLocaleString("tr-TR")}</td>
              <td>{o.purchasePrice ?? "—"}</td>
              <td>{o.salePrice ?? "—"}</td>
              <td>{calculateProfit(o)} ₺</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ⏩ Sayfalama Kontrolleri */}
      <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>⬅ Önceki</button>
        <span>Sayfa {page} / {totalPages || 1}</span>
        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Sonraki ➡</button>
      </div>

      {/* 📈 Grafik */}
      <h2>📈 Aylık Ciro & Kar Grafiği</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="ciro" stroke="#8884d8" name="Ciro ₺" />
          <Line type="monotone" dataKey="kar" stroke="#82ca9d" name="Kar ₺" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
