import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔹 Kullanıcı oturumu kontrol
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
    }
  }, [router]);

  // 🔹 Siparişleri getir
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const beginDate = "2025-10-01T00:00:00+03:00";
        const endDate = "2025-10-23T23:59:59+03:00";

        const url = `/api/hepsiburada-api/orders?offset=0&limit=100&beginDate=${encodeURIComponent(
          beginDate
        )}&endDate=${encodeURIComponent(endDate)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setOrders(data.items || data.content?.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // 🔹 Çıkış
  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Üst Menü */}
      <nav className="bg-white shadow-md px-6 py-4 flex flex-wrap justify-center gap-4 mb-8">
        <button
          onClick={() => router.push("/dashboard/orders")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          📦 Siparişler
        </button>

        <button
          onClick={() => router.push("/dashboard/cari")}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          💰 Cari Paneli
        </button>

        <button
          onClick={() => router.push("/dashboard/api-settings")}
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
        >
          ⚙️ API Ayarları
        </button>

        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          🚪 Çıkış Yap
        </button>
      </nav>

      {/* Sipariş Listesi */}
      <div className="px-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">
          Hepsiburada Siparişleri
        </h1>

        {loading && <div className="text-center">⏳ Yükleniyor...</div>}
        {error && <div className="text-center text-red-600">❌ Hata: {error}</div>}
        {!loading && orders.length === 0 && (
          <div className="text-center text-gray-500">📭 Şu anda sipariş bulunmamaktadır.</div>
        )}

        <ul className="max-w-2xl mx-auto">
          {orders.map((order, index) => (
            <li
              key={index}
              className="bg-white shadow p-4 rounded-lg mb-3 border border-gray-200"
            >
              <strong>Sipariş No:</strong> {order.orderNumber || order.id} <br />
              <strong>Tarih:</strong> {order.orderDate || "-"} <br />
              <strong>Durum:</strong> {order.status || "-"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
