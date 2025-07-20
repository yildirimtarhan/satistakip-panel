import { useEffect, useState } from "react";

export default function HepsiburadaOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/hepsiburada/orders");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Siparişler alınamadı.");
        }

        setOrders(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Hepsiburada Siparişleri</h1>

      {loading && <p>Yükleniyor...</p>}
      {error && <p style={{ color: "red" }}>Hata: {error}</p>}

      {!loading && !error && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Sipariş No</th>
              <th style={thStyle}>Müşteri</th>
              <th style={thStyle}>Durum</th>
              <th style={thStyle}>Tutar (₺)</th>
              <th style={thStyle}>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td style={tdStyle}>{order.orderNumber}</td>
                <td style={tdStyle}>{order.customer || "Bilinmiyor"}</td>
                <td style={tdStyle}>{order.status || "Bilinmiyor"}</td>
                <td style={tdStyle}>{order.totalPrice || "Bilinmiyor"}</td>
                <td style={tdStyle}>
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : "Bilinmiyor"}
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
  border: "1px solid #ccc",
  padding: "8px",
  backgroundColor: "#f0f0f0",
  textAlign: "left",
};

const tdStyle = {
  border: "1px solid #ccc",
  padding: "8px",
};
