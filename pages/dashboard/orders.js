// 📁 /pages/dashboard/orders.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DashboardNavbar from "@/components/DashboardNavbar";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // 🚪 Çıkış işlemi
  const logout = () => {
    localStorage.removeItem("token");
    router.push("/auth/login");
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // 🗓️ Tarihler ISO 8601 formatında olmalı
        const beginDate = "2025-10-01T00:00:00+03:00";
        const endDate = "2025-10-23T23:59:59+03:00";

        const url = `/api/hepsiburada-api/orders?offset=0&limit=100&beginDate=${encodeURIComponent(
          beginDate
        )}&endDate=${encodeURIComponent(endDate)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        console.log("📦 Gelen sipariş verisi:", data);

        if (data.items || (data.content && data.content.items)) {
          setOrders(data.items || data.content.items);
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error("❌ Siparişleri çekerken hata:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading)
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>⏳ Yükleniyor...</div>
    );

  if (error)
    return (
      <div style={{ padding: "20px", color: "red", textAlign: "center" }}>
        ❌ Hata: {error}
      </div>
    );

  return (
    <div>
      {/* 🔹 Üst Menü (Navbar) */}
      <DashboardNavbar onLogout={logout} />

      <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "1.8rem",
            marginBottom: "16px",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          📦 Hepsiburada Siparişleri
        </h1>

        {orders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "20px",
              color: "#64748b",
            }}
          >
            📭 Şu anda sipariş bulunmamaktadır.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {orders.map((order, index) => (
              <li
                key={index}
                style={{
                  marginBottom: "12px",
                  border: "1px solid #e5e7eb",
                  background: "white",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <p>
                  <strong>Sipariş No:</strong> {order.orderNumber || order.id}
                </p>
                <p>
                  <strong>Tarih:</strong> {order.orderDate || "-"}
                </p>
                <p>
                  <strong>Durum:</strong> {order.status || "-"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
