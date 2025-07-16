import { useEffect, useState } from 'react';

export default function HepsiburadaOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/hepsiburada/orders');
        const data = await res.json();

        if (data.success) {
          setOrders(data.orders);
        } else {
          setError(data.message || "Siparişler alınamadı");
        }
      } catch (err) {
        console.error("🔥 Frontend Hatası:", err);
        setError("Bir hata oluştu");
      }
    };

    fetchOrders();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🛍️ Hepsiburada Siparişleri</h1>
      
      {error && <p style={{ color: 'red' }}>⚠️ {error}</p>}

      {orders.length === 0 && !error && <p>Sipariş bulunamadı.</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {orders.map((order) => (
          <li key={order.id} style={{ 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '1rem', 
            marginBottom: '1rem' 
          }}>
            <strong>Sipariş No:</strong> {order.id}<br />
            <strong>Müşteri:</strong> {order.customer}<br />
            <strong>Durum:</strong> <span style={{ 
              color: order.status === 'Shipped' ? 'green' : 'orange' 
            }}>{order.status}</span><br />
            <strong>Tutar:</strong> {order.total} TL<br />
            <strong>Kargo:</strong> {order.cargo} ({order.trackingNumber})
          </li>
        ))}
      </ul>
    </div>
  );
}
