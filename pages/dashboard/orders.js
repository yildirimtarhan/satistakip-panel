import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import jwtDecode from "jwt-decode";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtreler
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    try {
      jwtDecode(token);
    } catch (err) {
      console.error("Token geçersiz:", err);
      localStorage.removeItem("token");
      router.push("/auth/login");
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/hepsiburada/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Siparişler alınamadı");
        } else {
          setOrders(data?.items || []);
          setFilteredOrders(data?.items || []);
        }
      } catch (err) {
        console.error("Sipariş çekme hatası:", err);
        setError("Sunucu hatası");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  // Filtreleme işlemi
  useEffect(() => {
    let filtered = [...orders];

    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (startDate) {
      filtered = filtered.filter(order => new Date(order.orderDate) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter(order => new Date(order.orderDate) <= new Date(endDate));
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [statusFilter, startDate, endDate, orders]);

  // Sayfalama hesaplaması
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📦 Hepsiburada Siparişleri</h1>

      {/* Filtre Alanı */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <label>Durum: </label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tümü</option>
            <option value="New">Yeni</option>
            <option value="Shipped">Kargolandı</option>
            <option value="Delivered">Teslim Edildi</option>
            <option value="Cancelled">İptal</option>
          </select>
        </div>

        <div>
          <label>Başlangıç Tarihi: </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label>Bitiş Tarihi: </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {loading && <p>Yükleniyor...</p>}
      {error && <p style={{ color: "red" }}>Hata: {error}</p>}

      {!loading && !error && currentOrders.length === 0 && (
        <p>Filtreye uygun sipariş bulunamadı.</p>
      )}

      {!loading && currentOrders.length > 0 && (
        <>
          <table border="1" cellPadding="8" style={{ marginTop: "1rem", width: "100%" }}>
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
              {currentOrders.map((order) => (
                <tr key={order.id} onClick={() => setSelectedOrder(order)} style={{ cursor: "pointer" }}>
                  <td>{order.id}</td>
                  <td>{order.customerName || "Bilinmiyor"}</td>
                  <td>{order.status}</td>
                  <td>{order.totalPrice || "0"}</td>
                  <td>{order.orderDate || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Sayfalama */}
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center", gap: "0.5rem" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: currentPage === page ? "#0070f3" : "#eee",
                  color: currentPage === page ? "#fff" : "#000",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                {page}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: "2rem",
              borderRadius: "8px",
              minWidth: "300px",
              maxWidth: "500px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Sipariş Detayı</h2>
            <p><b>Sipariş No:</b> {selectedOrder.id}</p>
            <p><b>Müşteri:</b> {selectedOrder.customerName}</p>
            <p><b>Durum:</b> {selectedOrder.status}</p>
            <p><b>Tutar:</b> {selectedOrder.totalPrice} ₺</p>
            <p><b>Tarih:</b> {selectedOrder.orderDate}</p>
            <button onClick={() => setSelectedOrder(null)} style={{ marginTop: "1rem" }}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
