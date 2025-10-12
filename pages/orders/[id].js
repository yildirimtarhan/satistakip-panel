// pages/orders/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchOrderDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/hepsiburada-api/orders/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Sipariş detayı alınamadı");
        }

        setOrder(data?.content || data);
      } catch (err) {
        console.error("Sipariş detayı alınamadı:", err);
        setError("Sipariş detayı alınamadı");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [id]);

  if (loading) return <p>⏳ Yükleniyor...</p>;
  if (error) return <p style={{ color: "red" }}>⚠ {error}</p>;
  if (!order) return <p>⚠️ Sipariş bulunamadı</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📝 Sipariş Detayı</h1>
      <p><b>Sipariş No:</b> {order.id}</p>
      <p><b>Müşteri:</b> {order.customerName || "—"}</p>
      <p><b>Durum:</b> {order.status || "—"}</p>
      <p>
        <b>Tarih:</b>{" "}
        {order.orderDate ? new Date(order.orderDate).toLocaleString("tr-TR") : "—"}
      </p>

      {/* 📦 Ürün Listesi */}
      {order.lines && order.lines.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>📦 Ürünler</h2>
          <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Ürün Adı</th>
                <th>SKU</th>
                <th>Adet</th>
                <th>Birim Fiyat ₺</th>
                <th>Toplam ₺</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line, i) => (
                <tr key={i}>
                  <td>{line.productName}</td>
                  <td>{line.sku}</td>
                  <td>{line.quantity}</td>
                  <td>{line.price}</td>
                  <td>{(line.quantity * line.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🚚 Kargo Bilgileri */}
      {order.shipmentInfo && (
        <div style={{ marginTop: "2rem" }}>
          <h2>🚚 Kargo Bilgileri</h2>
          <p><b>Kargo Firması:</b> {order.shipmentInfo?.carrierName || "—"}</p>
          <p><b>Kargo Takip No:</b> {order.shipmentInfo?.trackingNumber || "—"}</p>
          <p><b>Kargo Durumu:</b> {order.shipmentInfo?.status || "—"}</p>
        </div>
      )}

      {/* 🏠 Adres Bilgileri */}
      {order.address && (
        <div style={{ marginTop: "2rem" }}>
          <h2>🏠 Teslimat Adresi</h2>
          <p>
            {order.address.fullName} <br />
            {order.address.addressLine1} <br />
            {order.address.addressLine2 && <>{order.address.addressLine2}<br /></>}
            {order.address.city} / {order.address.province}
          </p>
        </div>
      )}
    </div>
  );
}
