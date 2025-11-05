import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

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

  // ✅ Kargo takip modalını aç
  const openTracking = (order) => {
    const trackingNumber = order.trackingNumber || order.shipmentTrackingNumber;

    const trackingUrl =
      order.shipmentTrackingUrl ||
      (trackingNumber
        ? `https://kargotakip.hepsiburada.com/?trackingNumber=${trackingNumber}`
        : null);

    setSelectedOrder({
      number: order.orderNumber,
      trackingNumber,
      trackingUrl,
    });
    setShowModal(true);
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
          <div className="text-center text-gray-500">
            📭 Şu anda sipariş bulunmamaktadır.
          </div>
        )}

        <ul className="max-w-2xl mx-auto">
          {orders.map((order, index) => (
            <li
              key={index}
              className="bg-white shadow p-4 rounded-lg mb-3 border border-gray-200"
            >
              <strong>Sipariş No:</strong> {order.orderNumber || order.id} <br />
              <strong>Tarih:</strong> {order.orderDate || "-"} <br />
              <strong>Durum:</strong> {order.status || "-"} <br />

              {/* ✅ Kargo Takip Button */}
              {order.trackingNumber || order.shipmentTrackingUrl ? (
                <button
                  className="mt-2 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  onClick={() => openTracking(order)}
                >
                  🚚 Kargo Takip
                </button>
              ) : (
                <p className="text-gray-500 mt-2 text-sm">📦 Kargo bilgisi yok</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ✅ Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-80">
            <h2 className="text-xl font-bold mb-2">Kargo Takip</h2>

            <p className="mb-3">
              <strong>Sipariş:</strong> {selectedOrder.number}
            </p>
            <p className="mb-3">
              <strong>Takip Kodu:</strong> {selectedOrder.trackingNumber}
            </p>

            {selectedOrder.trackingUrl ? (
              <a
                href={selectedOrder.trackingUrl}
                target="_blank"
                className="bg-green-600 text-white w-full block text-center px-4 py-2 rounded hover:bg-green-700"
              >
                Takip Linki ➜
              </a>
            ) : (
              <p className="text-gray-400 text-sm">Link bulunamadı</p>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-3 w-full bg-gray-300 px-4 py-2 rounded"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
