import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ✅ useCallback ile ESLint uyarısını çözüyoruz
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hepsiburada-api/orders?status=New");
      const data = await res.json();

      if (!res.ok) {
        console.warn("Hepsiburada API hatası:", data);
        setError("Hepsiburada API bağlantı hatası (dummy veri gösteriliyor)");
        setOrders([
          {
            id: "12345",
            customerName: "Deneme Müşteri",
            status: "Yeni",
            totalPrice: 149.9,
            createdDate: new Date().toISOString(),
            productName: "Deneme Ürünü",
          },
        ]);
        return;
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
            totalPrice: 149.9,
            createdDate: new Date().toISOString(),
            productName: "Deneme Ürünü",
          },
        ]);
      } else {
        items = items.map((o) => ({
          ...o,
          productName:
            o?.lines?.[0]?.productName ||
            o?.orderLines?.[0]?.productName ||
            o?.items?.[0]?.title ||
            "—",
        }));
        setOrders(items);
      }
    } catch (err) {
      console.error("Sipariş listesi alınamadı:", err);
      setError("Hepsiburada API bağlantı hatası (dummy veri gösteriliyor)");
      setOrders([
        {
          id: "12345",
          customerName: "Deneme Müşteri",
          status: "Yeni",
          totalPrice: 149.9,
          createdDate: new Date().toISOString(),
          productName: "Deneme Ürünü",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]); // ✅ Artık dependency eklendi

  useEffect(() => {
    let f = orders;

    if (search) {
      f = f.filter(
        (o) =>
          (o.customerName || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (o.id || "").includes(search) ||
          (o.productName || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    if (startDate) {
      f = f.filter((o) => new Date(o.createdDate) >= new Date(startDate));
    }
    if (endDate) {
      f = f.filter((o) => new Date(o.createdDate) <= new Date(endDate));
    }

    setFilteredOrders(f);
  }, [orders, search, startDate, endDate]);

  const exportToExcel = () => {
    const data = filteredOrders.map((o) => ({
      Platform: "Hepsiburada",
      "Sipariş No": o.id || o.orderNumber || "—",
      Müşteri: o.customerName || "—",
      Durum: o.status || "—",
      "Ürün Adı": o.productName || "—",
      Tutar: o.totalPrice || "—",
      Tarih: o.createdDate
        ? new Date(o.createdDate).toLocaleString("tr-TR")
        : "—",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siparişler");
    XLSX.writeFile(wb, `siparisler_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "1rem" }}>📦 Siparişler</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
        <button onClick={fetchOrders}>🔄 Yenile</button>
        <button onClick={exportToExcel}>📤 Excel&apos;e Aktar</button>
        {error && <span style={{ color: "red" }}>⚠ {error}</span>}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Ara (isim / sipariş no / ürün)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <ul>
        {filteredOrders.map((o, idx) => (
          <li key={o.id + "-" + idx} style={{ marginBottom: 8 }}>
            <Link href={`/orders/${o.id}`}>
              {o.customerName} - {o.status} - 🛍️ {o.productName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
