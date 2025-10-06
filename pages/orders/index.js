import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/hepsiburada-api/orders");
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Siparişler alınamadı");
        } else {
          setOrders(data.content || []);
        }
      } catch (err) {
        console.error("İstek hatası:", err);
        setError("Sunucuya ulaşılamıyor.");
      }
    };

    fetchOrders();
  }, [router]); // ✅ router dependency eklendi

  if (error) {
    return <div className="text-red-500 font-bold">⚠ {error}</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Hepsiburada Siparişleri</h1>
      {orders.length === 0 ? (
        <p>Hiç sipariş bulunamadı.</p>
      ) : (
        <ul>
          {orders.map((order) => (
            <li key={order.id}>
              {order.customerFirstName} {order.customerLastName} - {order.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
