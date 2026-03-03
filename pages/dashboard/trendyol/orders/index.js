"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function DashboardTrendyolOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trendyol/orders", { credentials: "include" });
      let data;
      try {
        data = await res.json();
      } catch (_) {
        setError("Sunucu beklenmeyen yanıt döndü. (IP kısıtlaması veya API ayarlarını kontrol edin.)");
        setOrders([]);
        setFilteredOrders([]);
        return;
      }

      if (!res.ok) {
        setError(data?.message || "Trendyol API erişimi başarısız. Test ortamında IP yetkisi gerekebilir.");
        setOrders([]);
        setFilteredOrders([]);
        return;
      }

      const items = data?.orders ?? data?.content ?? data?.data ?? [];
      if (!Array.isArray(items)) {
        setOrders([]);
        setFilteredOrders([]);
        return;
      }
      if (items.length === 0) setError("Henüz sipariş yok veya API ayarlarını kontrol edin.");

      setOrders(items);
      setFilteredOrders(items);
    } catch (err) {
      console.error("Trendyol sipariş listesi:", err);
      setError(err.message || "Liste yüklenemedi.");
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    handleFilter(term, dateRange);
  };

  const handleDateFilter = (field, value) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    handleFilter(searchTerm, newRange);
  };

  const handleFilter = (term = searchTerm, range = dateRange) => {
    let filtered = [...orders];
    if (term) {
      filtered = filtered.filter(
        (o) =>
          o.customerName?.toLowerCase().includes(term) ||
          o.productName?.toLowerCase().includes(term) ||
          String(o.id || "").toLowerCase().includes(term)
      );
    }
    if (range.start) {
      filtered = filtered.filter((o) => new Date(o.createdDate) >= new Date(range.start));
    }
    if (range.end) {
      filtered = filtered.filter((o) => new Date(o.createdDate) <= new Date(range.end));
    }
    setFilteredOrders(filtered);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trendyol Siparişler");
    XLSX.writeFile(workbook, "trendyol_siparisler.xlsx");
  };

  const displayStatus = (status) => {
    if (!status) return "—";
    const s = String(status).toLowerCase();
    if (s.includes("created") || s.includes("yeni")) return "🟡 Yeni";
    if (s.includes("shipped") || s.includes("kargo")) return "🔵 Kargoda";
    if (s.includes("cancelled") || s.includes("iptal")) return "🔴 İptal";
    if (s.includes("returned") || s.includes("iade")) return "🟠 İade";
    if (s.includes("delivered")) return "🟢 Teslim";
    return status;
  };

  const calculateProfit = (o) => {
    if (o.salePrice && o.purchasePrice) return (o.salePrice - o.purchasePrice).toFixed(2);
    return 0;
  };

  const getChartData = () => {
    const grouped = {};
    filteredOrders.forEach((order) => {
      const date = new Date(order.createdDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const profit = parseFloat(calculateProfit(order));
      if (!grouped[key]) grouped[key] = { date: key, ciro: 0, kar: 0 };
      grouped[key].ciro += order.salePrice || 0;
      grouped[key].kar += profit;
    });
    return Object.values(grouped);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-gray-500">⏳ Siparişler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Trendyol Siparişleri</h1>
      <p className="text-gray-500 mb-6">
        Trendyol siparişleriniz API üzerinden listelenir. Bağlantı için API Ayarları → Trendyol bölümünü kontrol edin.
      </p>

      <div className="bg-white border rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Sipariş no, müşteri, ürün ara..."
          value={searchTerm}
          onChange={handleSearch}
          className="border rounded-lg px-3 py-2 flex-1 min-w-[200px]"
        />
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => handleDateFilter("start", e.target.value)}
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => handleDateFilter("end", e.target.value)}
          className="border rounded-lg px-3 py-2"
        />
        <button
          type="button"
          onClick={fetchOrders}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
        >
          🔄 Yenile
        </button>
        <button
          type="button"
          onClick={exportToExcel}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
        >
          📊 Excel
        </button>
        {error && <span className="text-amber-600 text-sm">⚠ {error}</span>}
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Sipariş No</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Müşteri</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Ürün</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Durum</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Tarih</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Alış ₺</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Satış ₺</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Kar ₺</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    Sipariş bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o, i) => (
                  <tr key={o.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <Link href={`/trendyol/orders/${o.id}`} className="text-orange-600 hover:underline">
                        {o.id}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-700">{o.customerName ?? "—"}</td>
                    <td className="p-3 text-gray-700">{o.productName ?? "—"}</td>
                    <td className="p-3">{displayStatus(o.status)}</td>
                    <td className="p-3 text-gray-600">
                      {o.createdDate ? new Date(o.createdDate).toLocaleString("tr-TR") : "—"}
                    </td>
                    <td className="p-3 text-right text-gray-600">{o.purchasePrice ?? "—"}</td>
                    <td className="p-3 text-right font-medium">{o.salePrice ?? "—"}</td>
                    <td className="p-3 text-right text-gray-600">{calculateProfit(o)} ₺</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOrders.length > 0 && (
        <div className="mt-8 bg-white border rounded-xl shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Aylık Ciro & Kar</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={getChartData()}>
              <CartesianGrid stroke="#e5e7eb" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ciro" stroke="#f97316" name="Ciro ₺" />
              <Line type="monotone" dataKey="kar" stroke="#22c55e" name="Kar ₺" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
