// 📁 /pages/n11/orders/n11.js
import React, { useState } from "react";

export default function N11Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/n11/orders");
      const data = await res.json();

      if (data.success) {
        const orderList =
          data.data?.Envelope?.Body?.GetOrderListResponse?.orderList?.order || [];
        setOrders(Array.isArray(orderList) ? orderList : [orderList]);
      } else {
        alert("Sipariş alınamadı!");
      }
    } catch (error) {
      console.error("❌ Hata:", error);
      alert("Bağlantı hatası oluştu!");
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-orange-600">
        📦 N11 Siparişleri
      </h1>

      <button
        onClick={fetchOrders}
        disabled={loading}
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl"
      >
        {loading ? "Yükleniyor..." : "🔄 Siparişleri Getir"}
      </button>

      <ul className="mt-6 space-y-2">
        {orders.length === 0 && !loading && (
          <p className="text-gray-500 mt-3">Henüz sipariş bulunamadı.</p>
        )}
        {orders.map((order, i) => (
          <li key={i} className="border p-3 rounded-lg shadow-sm">
            <strong>Sipariş No:</strong> {order?.id || "-"} <br />
            <strong>Durum:</strong> {order?.status || "-"} <br />
            <strong>Tarih:</strong> {order?.createDate || "-"}
          </li>
        ))}
      </ul>
    </div>
  );
}
