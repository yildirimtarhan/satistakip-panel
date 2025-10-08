/* eslint-disable react/no-unescaped-entities */
// pages/trendyol/orders/index.js
import { useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function TrendyolOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dummy fallback (API boş/erişilemezse)
  const dummyOrders = [
    {
      id: "T-001",
      customerName: "Deneme Müşteri",
      productName: "Test Ürünü",
      status: "Yeni",
      totalPrice: 199.9,
      createdDate: "2025-10-01T10:00:00.000Z",
    },
    {
      id: "T-002",
      customerName: "Ahmet Yılmaz",
      productName: "Bluetooth Kulaklık",
      status: "Kargoya Verildi",
      totalPrice: 349.9,
      createdDate: "2025-10-05T12:30:00.000Z",
    },
    {
      id: "T-003",
      customerName: "Ayşe Demir",
      productName: "iade Edilen Ürün",
      status: "İptal / İade",
      totalPrice: 89.9,
      createdDate: "2025-09-28T09:15:00.000Z",
    },
  ];

  // API'den çek
  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trendyol/orders");
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Trendyol API hatası");

      let items =
        data?.content?.orders ||
        data?.orders ||
        data?.data ||
        [];

      if (!Array.isArray(items)) items = [];

      if (items.length === 0) {
        setError("⚠ Trendyol API boş döndü (örnek veri gösteriliyor)");
        items = dummyOrders;
      }

      // Normalize alanlar
      items = items.map((o) => ({
        ...o,
        productName:
          o.productName ||
          o?.lines?.[0]?.productName ||
          o?.orderLines?.[0]?.productName ||
          o?.items?.[0]?.title ||
          "—",
        customerName:
          o.customerName ||
          `${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim() ||
          "—",
        createdDate:
          o.createdDate ||
          o.orderDate ||
          o.shipmentPackageCreatedDate ||
          new Date().toISOString(),
        totalPrice: o.totalPrice ?? o.totalAmount ?? o.price ?? 0,
        status: o.status || o.orderStatus || "—",
      }));

      setOrders(items);
      setFiltered(items);
    } catch (err) {
      console.error("❌ Trendyol sipariş listesi alınamadı:", err);
      setError("⚠ Trendyol API bağlantı hatası (örnek veri gösteriliyor)");
      setOrders(dummyOrders);
      setFiltered(dummyOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Arama + Tarih + Durum filtreleri
  useEffect(() => {
    let result = [...orders];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (o) =>
          (o.id || "").toLowerCase().includes(q) ||
          (o.customerName || "").toLowerCase().includes(q) ||
          (o.productName || "").toLowerCase().includes(q)
      );
    }

    if (startDate) {
      result = result.filter(
        (o) => new Date(o.createdDate) >= new Date(startDate)
      );
    }
    if (endDate) {
      result = result.filter(
        (o) => new Date(o.createdDate) <= new Date(endDate + "T23:59:59")
      );
    }

    if (statusFilter !== "Tümü") {
      result = result.filter((o) => o.status === statusFilter);
    }

    setFiltered(result);
  }, [orders, searchTerm, startDate, endDate, statusFilter]);

  // Excel'e aktar (filtreli)
  const exportToExcel = () => {
    const rows = filtered.map((o) => ({
      Platform: "Trendyol (Stage)",
      "Sipariş No": o.id || o.orderNumber || o.orderId || "—",
      Müşteri: o.customerName || "—",
      "Ürün Adı": o.productName || "—",
      Durum: o.status || "—",
      Tutar: o.totalPrice ?? 0,
      Tarih: o.createdDate ? new Date(o.createdDate).toLocaleString("tr-TR") : "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siparişler");
    XLSX.writeFile(
      wb,
      `trendyol_siparisler_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🛍️ Trendyol Siparişleri</h1>

      {/* Filtre Paneli */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" }}>
        <button onClick={fetchOrders}>🔄 Yenile</button>
        <input
          type="text"
          placeholder="🔍 Sipariş / Müşteri / Ürün"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: 6, minWidth: 220 }}
        />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="Tümü">Tümü</option>
          <option value="Yeni">Yeni</option>
          <option value="Kargoya Verildi">Kargoya Verildi</option>
          <option value="İptal">İptal</option>
          <option value="İade">İade</option>
          <option value="İptal / İade">İptal / İade</option>
        </select>

        <button onClick={exportToExcel}>📊 Excel&apos;e Aktar</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Liste */}
      <ul>
        {filtered.length > 0 ? (
          filtered.map((order) => (
            <li key={order.id} style={{ marginBottom: 8 }}>
              <Link href={`/trendyol/orders/${order.id}`}>
                <strong>{order.customerName}</strong> — {order.productName} —{" "}
                <em>{order.status}</em> — {(order.totalPrice ?? 0).toFixed(2)} ₺ —{" "}
                {new Date(order.createdDate).toLocaleString("tr-TR")}
              </Link>
            </li>
          ))
        ) : (
          <p>📭 Kayıtlı sipariş bulunamadı</p>
        )}
      </ul>
    </div>
  );
}
