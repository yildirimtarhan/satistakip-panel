// pages/dashboard/orders.js
import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/hepsiburada-api/orders/list");
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error("Siparişler alınamadı:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  if (loading) return <p className="p-4">Yükleniyor...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📦 Hepsiburada Siparişleri</h1>
      {orders.length === 0 ? (
        <p>Henüz sipariş bulunmuyor.</p>
      ) : (
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Sipariş No</th>
              <th className="border p-2">Durum</th>
              <th className="border p-2">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td className="border p-2">{order.orderNumber}</td>
                <td className="border p-2">{order.data?.status || "—"}</td>
                <td className="border p-2">
                  {new Date(order.fetchedAt).toLocaleString("tr-TR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
