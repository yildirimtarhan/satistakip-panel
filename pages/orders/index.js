// pages/orders/index.js
import Link from "next/link";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx"; // 📌 Excel export için eklendi
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [platformFilter, setPlatformFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [chartRange, setChartRange] = useState("all");

  // 📡 Siparişleri çek
  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      // 🟡 Hepsiburada
      const hepsiRes = await fetch("/api/hepsiburada-api/orders?status=New");
      const hepsiData = await hepsiRes.json();
      let hepsiItems = hepsiData?.content?.orders || hepsiData?.orders || [];
      if (!Array.isArray(hepsiItems)) hepsiItems = [];
      hepsiItems = hepsiItems.map((o) => ({
        ...o,
        platform: "Hepsiburada",
        createdAt: o.createdDate || new Date().toISOString(),
        status: normalizeStatus(o.status),
        totalPrice: o.totalPrice || o.totalAmount || 0,
      }));

      // 🟡 Trendyol
      const trendyolRes = await fetch("/api/trendyol/orders");
      const trendyolData = await trendyolRes.json();
      let trendyolItems = trendyolData?.content?.orders || trendyolData?.orders || [];
      if (!Array.isArray(trendyolItems)) trendyolItems = [];
      trendyolItems = trendyolItems.map((o) => ({
        ...o,
        platform: "Trendyol",
        createdAt: o.orderDate || new Date().toISOString(),
        status: normalizeStatus(o.status),
        totalPrice: o.totalPrice || o.totalAmount || 0,
      }));

      const combined = [...hepsiItems, ...trendyolItems];

      if (combined.length === 0) {
        setError("API bağlantı hatası (örnek veri gösteriliyor)");
        setOrders([
          {
            id: "HB-12345",
            customerName: "Hepsi Müşteri",
            status: "Yeni",
            platform: "Hepsiburada",
            createdAt: new Date().toISOString(),
            totalPrice: 250,
          },
          {
            id: "TY-67890",
            customerName: "Trendyol Müşteri",
            status: "Kargoda",
            platform: "Trendyol",
            createdAt: new Date().toISOString(),
            totalPrice: 480,
          },
        ]);
      } else {
        const sorted = combined.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setOrders(sorted);
      }
    } catch (err) {
      console.error("Sipariş listesi alınamadı:", err);
      setError("API bağlantı hatası (örnek veri gösteriliyor)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const normalizeStatus = (status) => {
    if (!status) return "Bilinmiyor";
    const s = status.toLowerCase();
    if (s.includes("new") || s.includes("yeni")) return "Yeni";
    if (s.includes("approved") || s.includes("onay")) return "Onaylandı";
    if (s.includes("shipped") || s.includes("cargo") || s.includes("kargo"))
      return "Kargoda";
    if (s.includes("cancel")) return "İptal";
    if (s.includes("return") || s.includes("iade")) return "İade";
    return status;
  };

  // 🧠 Filtreleme & arama
  useEffect(() => {
    let filtered = [...orders];

    if (platformFilter !== "Tümü") {
      filtered = filtered.filter((o) => o.platform === platformFilter);
    }
    if (statusFilter !== "Tümü") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }
    if (startDate) {
      filtered = filtered.filter(
        (o) => new Date(o.createdAt) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(
        (o) => new Date(o.createdAt) <= new Date(endDate + "T23:59:59")
      );
    }
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          (o.id && o.id.toLowerCase().includes(term)) ||
          (o.customerName && o.customerName.toLowerCase().includes(term))
      );
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [orders, platformFilter, statusFilter, startDate, endDate, searchTerm]);

  const displayId = (o) =>
    o.id || o.orderNumber || o.merchantOrderId || o.orderId || "bilinmiyor";
  const displayName = (o) =>
    o.customerName ||
    `${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim() ||
    "Müşteri";
  const displayStatus = (o) => o.status || "—";

  // 📤 Excel'e Aktar
  const exportToExcel = () => {
    const exportData = filteredOrders.map((o) => ({
      Platform: o.platform,
      "Sipariş No": displayId(o),
      Müşteri: displayName(o),
      Durum: displayStatus(o),
      Tutar: o.totalPrice || 0,
      Tarih: new Date(o.createdAt).toLocaleString("tr-TR"),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siparişler");

    const fileName = `siparisler_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  if (loading) return <p className="p-4">⏳ Yükleniyor...</p>;

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4 flex justify-between items-center">
        📦 Siparişler
        <button
          onClick={exportToExcel}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          📤 Excel'e Aktar
        </button>
      </h1>

      {/* Filtre Paneli */}
      <div className="bg-gray-100 rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-center">
        <button onClick={fetchOrders} className="px-3 py-1 bg-blue-600 text-white rounded">🔄 Yenile</button>
        <select className="border p-1 rounded" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
          <option>Tümü</option>
          <option>Hepsiburada</option>
          <option>Trendyol</option>
        </select>
        <select className="border p-1 rounded" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>Tümü</option>
          <option>Yeni</option>
          <option>Onaylandı</option>
          <option>Kargoda</option>
          <option>İade</option>
          <option>İptal</option>
        </select>
        <input type="date" className="border p-1 rounded" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="border p-1 rounded" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <input
          type="text"
          placeholder="🔍 Sipariş No / Müşteri"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-1 rounded flex-grow"
        />
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">Platform</th>
              <th className="p-2">Sipariş No</th>
              <th className="p-2">Müşteri</th>
              <th className="p-2">Durum</th>
              <th className="p-2">Tutar</th>
              <th className="p-2">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order, idx) => {
              const oid = displayId(order);
              const name = displayName(order);
              const st = displayStatus(order);
              const date = new Date(order.createdAt).toLocaleString("tr-TR");
              const href = oid !== "bilinmiyor" ? `/orders/${oid}` : undefined;
              return (
                <tr key={oid + "-" + idx} className="border-t hover:bg-gray-50">
                  <td className="p-2">{order.platform}</td>
                  <td className="p-2 text-blue-600">
                    {href ? <Link href={href}>{oid}</Link> : oid}
                  </td>
                  <td className="p-2">{name}</td>
                  <td className="p-2">{st}</td>
                  <td className="p-2">{(order.totalPrice || 0).toFixed(2)} ₺</td>
                  <td className="p-2">{date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ⬅ Önceki
          </button>
          <span>
            Sayfa {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Sonraki ➡
          </button>
        </div>
      )}
    </div>
  );
}
