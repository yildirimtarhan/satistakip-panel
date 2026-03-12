"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { FaturaModal } from "@/components/pazaryeri/FaturaModal";
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
  const [errorStatus, setErrorStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [faturaOrderNumber, setFaturaOrderNumber] = useState(null);
  const [testOrderLoading, setTestOrderLoading] = useState(false);
  const [testOrderResult, setTestOrderResult] = useState(null);

  const createTestOrder = async () => {
    setTestOrderLoading(true);
    setTestOrderResult(null);
    try {
      const res = await fetch("/api/trendyol/orders/create-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setTestOrderResult(data);
      if (data.success) setTimeout(() => fetchOrders(), 2000);
    } catch (e) {
      setTestOrderResult({ success: false, message: e.message });
    } finally {
      setTestOrderLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    setErrorStatus(null);
    try {
      const res = await fetch("/api/trendyol/orders", { credentials: "include" });
      let data;
      try {
        data = await res.json();
      } catch (_) {
        setError("Sunucu beklenmeyen yanıt döndü. (IP kısıtlaması veya API ayarlarını kontrol edin.)");
        setErrorStatus(null);
        setOrders([]);
        setFilteredOrders([]);
        return;
      }

      if (!res.ok) {
        setErrorStatus(res.status);
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

      {testOrderResult && (
        <div className={`mb-4 p-4 rounded-xl border ${testOrderResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {testOrderResult.success ? (
            <>
              <p className="font-medium">✅ {testOrderResult.message}</p>
              {testOrderResult.orderNumber && <p className="text-sm mt-1">Sipariş No: <strong>{testOrderResult.orderNumber}</strong></p>}
            </>
          ) : (
            <p className="font-medium">❌ {testOrderResult.message}</p>
          )}
        </div>
      )}

      {error && (
        <div className={`mb-6 p-4 rounded-xl border ${errorStatus === 401 ? "bg-amber-50 border-amber-200" : "bg-orange-50 border-orange-200"}`}>
          <p className="font-medium text-amber-800 mb-2">▲ {error}</p>
          <Link
            href="/dashboard/api-settings?tab=trendyol"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium"
          >
            API Ayarları → Trendyol&apos;a git
          </Link>
        </div>
      )}

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
          onClick={createTestOrder}
          disabled={testOrderLoading}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
          title="Stage ortamında test siparişi oluşturur. Onaylı ürün barkodunuz yoksa API'ye POST { lines: [{ barcode: 'BARKOD', quantity: 1 }] } gönderin."
        >
          {testOrderLoading ? "⏳ Oluşturuluyor…" : "🧪 Test Siparişi"}
        </button>
        <button
          type="button"
          onClick={exportToExcel}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
        >
          📊 Excel
        </button>
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
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Kargo</th>
                <th className="text-center p-3 text-sm font-semibold text-gray-700">Etiket</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Satış ₺</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    Sipariş bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o, i) => (
                  <tr key={o.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <Link href={`/dashboard/trendyol/orders/${o.id}`} className="text-orange-600 hover:underline font-mono">
                        {o.id}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-700">{o.customerName ?? "—"}</td>
                    <td className="p-3 text-gray-700">{o.productName ?? "—"}</td>
                    <td className="p-3">{displayStatus(o.status)}</td>
                    <td className="p-3 text-gray-600">
                      {o.createdDate ? new Date(o.createdDate).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                    <td className="p-3">
                      {o.trackingNumber ? (
                        <a href={`https://www.google.com/search?q=${encodeURIComponent(o.trackingNumber)}+kargo+takip`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Takip</a>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <a href={`/api/trendyol/orders/kargo-etiket?orderNumber=${encodeURIComponent(o.id)}`} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-medium">Etiket</a>
                    </td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => setFaturaOrderNumber(o.id)} className="text-orange-600 hover:underline text-sm font-medium">E-arşiv fatura</button>
                    </td>
                    <td className="p-3 text-right font-medium">{o.salePrice ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FaturaModal
        open={!!faturaOrderNumber}
        onClose={() => setFaturaOrderNumber(null)}
        orderNumber={faturaOrderNumber}
        marketplace="trendyol"
        token={typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("accessToken") : ""}
      />

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
