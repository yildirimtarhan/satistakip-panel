import { useEffect, useState } from "react";
import Link from "next/link";

export default function HepsiburadaOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hepsiburada-api/orders?page=${page}&limit=${limit}`);

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Hepsiburada siparişleri alınamadı");

        const items =
          data?.content?.items ||
          data?.content?.orders ||
          data?.orders ||
          [];

        setOrders(items);
      } catch (err) {
        console.error("🔥 HB Orders Frontend Error:", err);
        setError("Siparişler alınamadı");
      }
      setLoading(false);
    };

    fetchOrders();
  }, [page]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>📦 Hepsiburada Siparişleri</h1>

      {error && <p style={{ color: "red" }}>⚠ {error}</p>}
      {loading && <p>⏳ Yükleniyor...</p>}

      {!loading && orders.length === 0 && (
        <p>📭 Sipariş bulunamadı</p>
      )}

      <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>Sipariş No</th>
            <th>Müşteri</th>
            <th>Ürün</th>
            <th>Durum</th>
            <th>Tarih</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, idx) => (
            <tr key={idx}>
              <td>{o.id || o.orderNumber}</td>
              <td>{o.customer?.name || o.customerName || "—"}</td>
              <td>{o.orderLines?.[0]?.productName || o.productName || "—"}</td>
              <td>{o.status || o.orderStatus || "—"}</td>
              <td>
                {o.orderDate
                  ? new Date(o.orderDate).toLocaleString("tr-TR")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sayfalama */}
      <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>⬅ Önceki</button>
        <span>Sayfa: {page}</span>
        <button onClick={() => setPage(page + 1)}>Sonraki ➡</button>
      </div>
    </div>
  );
}
