import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function HBOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ✅ Login kontrol
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/auth/login");
  }, []);

  // ✅ Sipariş Listesi Getir
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const url = `/api/hepsiburada-api/orders`; // tarih param yok → DB’den getir
        const res = await fetch(url);
        const data = await res.json();

        // ✅ API ya da MongoDB response normalize
        const formatted = (data.orders || []).map((o) => ({
          orderNumber: o.orderNumber || o.data?.orderNumber,
          status: o.status || o.data?.status || o.data?.orderStatus || "—",
          orderDate: o.orderDate || o.data?.orderDate || o.fetchedAt,
          shippingTrackingCode:
            o.data?.delivery?.trackingNumber ||
            o.data?.shipmentTrackingNumber ||
            null,
          trackingUrl:
            o.data?.shipmentTrackingUrl ||
            (o.data?.delivery?.trackingNumber
              ? `https://kargotakip.hepsiburada.com/?trackingNumber=${o.data.delivery.trackingNumber}`
              : null),
        }));

        setOrders(formatted);
      } catch (err) {
        console.error("HB Order UI error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const openTracking = (order) => {
    if (!order.shippingTrackingCode) return alert("Takip bilgisi yok.");
    setSelectedOrder(order);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">
        🛍️ Hepsiburada Siparişleri
      </h1>

      {loading && <p className="text-center">⏳ Yükleniyor...</p>}
      {!loading && orders.length === 0 && (
        <p className="text-center text-gray-500">📭 Sipariş bulunamadı.</p>
      )}

      <ul className="max-w-2xl mx-auto">
        {orders.map((order, idx) => (
          <li key={idx} className="bg-white p-4 shadow rounded mb-3">
            <strong>Sipariş No:</strong> {order.orderNumber} <br />
            <strong>Tarih:</strong>{" "}
            {order.orderDate
              ? new Date(order.orderDate).toLocaleString("tr-TR")
              : "—"}
            <br />
            <strong>Durum:</strong> {order.status} <br />

            {order.shippingTrackingCode ? (
              <button
                className="mt-2 w-full bg-blue-600 text-white py-2 rounded"
                onClick={() => openTracking(order)}
              >
                🚚 Kargo Takip
              </button>
            ) : (
              <div className="text-gray-500 text-sm mt-2">
                📦 Kargo bilgisi henüz yok
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* ✅ Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-80">
            <h2 className="text-xl font-bold mb-3">Kargo Takip</h2>

            <p>
              <strong>Sipariş:</strong> {selectedOrder.orderNumber}
            </p>
            <p>
              <strong>Takip Kodu:</strong>{" "}
              {selectedOrder.shippingTrackingCode || "—"}
            </p>

            <a
              href={selectedOrder.trackingUrl}
              target="_blank"
              className="block mt-3 text-center bg-green-600 text-white py-2 rounded"
            >
              Takip Linki ➜
            </a>

            <button
              className="mt-2 w-full bg-gray-300 py-2 rounded"
              onClick={() => setShowModal(false)}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
