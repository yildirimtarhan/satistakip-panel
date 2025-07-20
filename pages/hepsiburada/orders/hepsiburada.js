// pages/hepsiburada/orders/hepsiburada.js

import { useEffect, useState } from "react";

export default function HepsiburadaOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/hepsiburada/orders");
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error("Siparişleri alırken hata:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Hepsiburada Siparişleri</h1>

      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <table border="1" cellPadding="10" style={{ width: "100%", marginTop: "1rem" }}>
          <thead>
            <tr>
              <th>Sipariş No</th>
              <th>Müşteri</th>
              <th>Durum</th>
              <th>Tutar (₺)</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.orderNumber}</td>
                <td>{order.customer}</td>
                <td>{order.status}</td>
                <td>{order.totalPrice}</td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
