// pages/orders/index.js
import Link from "next/link";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 📡 Hepsiburada API'den siparişleri çek
  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hepsiburada-api/orders?status=New");
      const data = await res.json();

      if (!res.ok) {
        console.warn("Hepsiburada API hatası:", data);
        throw new Error(data.message || "Hepsiburada API bağlantı hatası");
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
        items = [
          {
            id: "12345",
            customerName: "Deneme Müşteri",
            status: "Yeni",
            productName: "Deneme Ürünü",
            salePrice: 250,
            purchasePrice: 200,
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
          productName: "Deneme Ürünü",
          salePrice: 250,
          purchasePrice: 200,
          createdDate: new Date().toISOString(),
        },
      ];
      setOrders(dummy);
      setFilteredOrders(dummy);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Sipariş arama
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);
    const filtered = orders.filter(
      (o) =>
        o.id?.toString().toLowerCase().includes(value) ||
        o.customerName?.toLowerCase().includes(value) ||
        o.productName?.toLowerCase().includes(value)
    );
    setFilteredOrders(filtered);
  };

  // 📊 Excel’e aktar
  const exportToExcel = (data) => {
    if (!data || data.length === 0) {
      alert("Aktarılacak veri bulunamadı.");
      return;
    }

    const exportData = data.map((o) => ({
      "Sipariş No": o.id,
      "Müşteri": o.customerName,
      "Ürün Adı": o.productName,
      "Durum": o.status,
      "Satış Fiyatı": o.salePrice,
      "Alış Fiyatı": o.purchasePrice,
      "Kâr/Zarar": o.salePrice - o.purchasePrice,
      "Tarih": new Date(o.createdDate).toLocaleString("tr-TR"),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siparişler");

    XLSX.writeFile(wb, "Hepsiburada_Siparisler.xlsx");
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <p>⏳ Yükleniyor...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "1rem" }}>📦 Hepsiburada Siparişleri</h1>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={fetchOrders}>🔄 Yenile</button>
        <input
          type="text"
          placeholder="🔍 Sipariş ara..."
          value={searchTerm}
          onChange={handleSearch}
          style={{ padding: "0.4rem", flex: "1", minWidth: "200px" }}
        />
        <button
          onClick={() => exportToExcel(filteredOrders)}
          style={{ background: "#16a34a", color: "white", padding: "0.4rem 0.8rem", borderRadius: "4px" }}
        >
          📊 Excel'e Aktar
        </button>
        {error && <span style={{ color: "red" }}>⚠ {error}</span>}
      </div>

      <ul>
        {filteredOrders.map((order, idx) => {
          const oid = order.id || "bilinmiyor";
          const href = oid !== "bilinmiyor" ? `/orders/${oid}` : undefined;

          const karZarar = order.salePrice - order.purchasePrice;
          const formattedDate = new Date(order.createdDate).toLocaleString("tr-TR");

          return (
            <li key={oid + "-" + idx} style={{ marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
              {href ? (
                <Link href={href}>
                  <strong>{order.customerName}</strong> - {order.productName} - {order.status} <br />
                  💰 Satış: {order.salePrice} ₺ | 🛒 Alış: {order.purchasePrice} ₺ | 📈 Kâr/Zarar:{" "}
                  <span style={{ color: karZarar >= 0 ? "green" : "red" }}>{karZarar} ₺</span> <br />
                  🕓 {formattedDate}
                </Link>
              ) : (
                <span>
                  <strong>{order.customerName}</strong> - {order.productName} - {order.status}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
