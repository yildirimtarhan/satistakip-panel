import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode"; // ✅ named export

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem("token");

      // Token yoksa login ekranına yönlendir
      if (!token) {
        router.push("/auth/login");
        return;
      }

      // Token geçerli mi kontrol et
      try {
        jwtDecode(token);
      } catch (err) {
        console.error("Token geçersiz:", err);
        localStorage.removeItem("token");
        router.push("/auth/login");
        return;
      }

      try {
        const res = await fetch("/api/hepsiburada/orders", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || data.message || "Siparişleri çekerken bir hata oluştu");
        } else {
          setOrders(data.content || []); // Hepsiburada API'sinde "content" listede yer alır
        }
      } catch (err) {
        console.error("Sipariş istek hatası:", err);
        setError("Sunucuya ulaşılamıyor");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return <div className="p-4">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500 font-bold">⚠ {error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">📦 Hepsiburada Siparişleri</h1>

      {orders.length === 0 ? (
        <p>Hiç yeni sipariş bulunamadı.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {orders.map((order) => (
            <li
              key={order.id}
              className="p-3 hover:bg-gray-100 cursor-pointer"
              onClick={() => router.push(`/orders/${order.id}`)}
            >
              <div className="font-semibold">
                {order.customerName || order.buyerName || "Müşteri"}
              </div>
              <div className="text-sm text-gray-600">Sipariş No: {order.id}</div>
              <div className="text-sm">{order.status}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
