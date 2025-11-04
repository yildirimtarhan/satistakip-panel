// pages/dashboard/hepsiburada/orders/index.js
import { useEffect, useState } from "react";

export default function HepsiburadaOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/hepsiburada-api/orders");
        const data = await res.json();

        if (!data.success) {
          setError(data.error || "Siparişler alınamadı");
        } else {
          const items = data.content?.items || data.items || [];
          setOrders(items);
        }
      } catch (err) {
        console.error("🔥 Frontend Hatası:", err);
        setError("Bağlantı hatası");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>🛍️ Hepsiburada Siparişleri</h1>

      {loading && <p>⏳ Yükleniyor...</p>}
      {error && <p style={{ color: "red" }}>⚠️ {error}</p>}

      {!loading && !error && orders.length === 0 && <p>📭 Sipariş bulunamadı.</p>}

      {!loading && orders.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Sipariş No</th>
              <th style={thStyle}>Durum</th>
              <th style={thStyle}>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => (
              <tr key={i}>
                <td style={tdStyle}>{order.orderNumber}</td>
                <td style={tdStyle}>{order.orderStatus || order.status || "–"}</td>
                <td style={tdStyle}>
                  {order.lastStatusUpdateDate
                    ? new Date(order.lastStatusUpdateDate).toLocaleString("tr-TR")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = {
  border: "1px solid #ddd",
  padding: "8px",
  backgroundColor: "#f8f8f8",
  textAlign: "left",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: "8px",
};
